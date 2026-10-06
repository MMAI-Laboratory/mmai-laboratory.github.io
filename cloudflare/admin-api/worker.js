// MMAI Lab admin API (Cloudflare Worker).
//
// Serves aggregated Cloudflare Web Analytics numbers to the private /admin
// page and edits the MMAI publication sheet. Every data request must carry a
// Google ID token for an address on the ADMIN_ALLOWED_EMAILS allow list; the
// Worker verifies the token's signature itself, so the Cloudflare API token,
// the Google service account key and the GitHub token never leave it.
//
// Adapted from the AAIG admin Worker. Publications follow the same pipeline:
// the Worker writes rows to the sheet and dispatches the sync workflow, which
// opens a review pull request; nothing reaches the site until it is merged.

import RESEARCH_CATALOG from "../../src/assets/dataset/research_areas.json" with { type: "json" };
import {
    PUBLICATION_SHEET_COLUMNS,
    PUBLICATION_SHEET_REQUIRED_COLUMNS,
    suggestPublicationId,
    toSlug,
    validateSheetRowForSave,
} from "../../src/utils/publicationSheetRules.js";

const CLOUDFLARE_GRAPHQL_ENDPOINT =
    "https://api.cloudflare.com/client/v4/graphql";
const ALLOWED_PERIODS = new Set([7, 30]);

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set([
    "accounts.google.com",
    "https://accounts.google.com",
]);
// Google ID tokens are short lived, so a minute of clock drift is the only
// tolerance worth allowing.
const CLOCK_SKEW_SECONDS = 60;

// Google rotates its signing keys, so the key set is cached for exactly as
// long as Google says it is valid rather than for the lifetime of the isolate.
let googleKeyCache = { keys: new Map(), expiresAt: 0, refreshedAt: 0 };

const jsonResponse = (request, env, payload, status = 200) => {
    const headers = {
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        Vary: "Origin",
    };
    const allowedOrigin = getAllowedOrigin(request, env);
    if (allowedOrigin) {
        headers["Access-Control-Allow-Origin"] = allowedOrigin;
    }

    return new Response(status === 204 ? null : JSON.stringify(payload), {
        status,
        headers,
    });
};

const getAllowedOrigins = (env) =>
    String(env.ADMIN_ORIGIN || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

const getAllowedOrigin = (request, env) => {
    const requestOrigin = request.headers.get("Origin") || "";
    const allowedOrigins = getAllowedOrigins(env);
    return allowedOrigins.includes(requestOrigin) ? requestOrigin : "";
};

const isAllowedOrigin = (request, env) => {
    const origin = request.headers.get("Origin");
    return !origin || getAllowedOrigins(env).includes(origin);
};

const getBearerCredential = (request) => {
    const header = request.headers.get("Authorization") || "";
    return header.startsWith("Bearer ")
        ? header.slice("Bearer ".length).trim()
        : "";
};

const getAllowedEmails = (env) =>
    new Set(
        String(env.ADMIN_ALLOWED_EMAILS || "")
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
    );

const hasGoogleConfiguration = (env) =>
    Boolean(env.GOOGLE_CLIENT_ID) && getAllowedEmails(env).size > 0;

const decodeBase64Url = (value) => {
    const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
    const padding = (4 - (normalized.length % 4)) % 4;
    const binary = atob(normalized + "=".repeat(padding));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
};

const decodeJwtSegment = (segment) =>
    JSON.parse(new TextDecoder().decode(decodeBase64Url(segment)));

const getGoogleSigningKey = async (keyId) => {
    const now = Date.now();
    const isCacheFresh = googleKeyCache.expiresAt > now;

    if (isCacheFresh && googleKeyCache.keys.has(keyId)) {
        return googleKeyCache.keys.get(keyId);
    }

    // An unrecognised key id almost always means a forged token. Refetching at
    // most once a minute still picks up a real Google key rotation quickly,
    // without letting made-up ids drive one outbound request each.
    if (isCacheFresh && now - googleKeyCache.refreshedAt < 60_000) {
        return null;
    }

    const response = await fetch(GOOGLE_JWKS_URL);
    if (!response.ok) {
        throw new Error(`Google key set returned ${response.status}`);
    }

    const payload = await response.json();
    const maxAge = Number(
        /max-age=(\d+)/.exec(response.headers.get("Cache-Control") || "")?.[1],
    );
    const keys = new Map();

    for (const jwk of payload.keys ?? []) {
        if (!jwk.kid) continue;
        keys.set(
            jwk.kid,
            await crypto.subtle.importKey(
                "jwk",
                jwk,
                { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                false,
                ["verify"],
            ),
        );
    }

    googleKeyCache = {
        keys,
        expiresAt: now + (Number.isFinite(maxAge) ? maxAge : 3600) * 1000,
        refreshedAt: now,
    };
    return keys.get(keyId) ?? null;
};

const expiredSession = {
    ok: false,
    status: 401,
    error: "로그인이 만료되었습니다. 다시 로그인해주세요.",
};

const verifyGoogleIdentity = async (credential, env) => {
    const segments = credential.split(".");
    if (segments.length !== 3) return expiredSession;

    let header;
    let claims;
    try {
        header = decodeJwtSegment(segments[0]);
        claims = decodeJwtSegment(segments[1]);
    } catch {
        return expiredSession;
    }

    if (header.alg !== "RS256" || !header.kid) return expiredSession;

    let signingKey;
    try {
        signingKey = await getGoogleSigningKey(header.kid);
    } catch {
        return {
            ok: false,
            status: 503,
            error: "Google 로그인 확인 서비스를 사용할 수 없습니다.",
        };
    }
    if (!signingKey) return expiredSession;

    const isSignatureValid = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        signingKey,
        decodeBase64Url(segments[2]),
        new TextEncoder().encode(`${segments[0]}.${segments[1]}`),
    );
    if (!isSignatureValid) return expiredSession;

    const now = Math.floor(Date.now() / 1000);
    const isIssuerValid = GOOGLE_ISSUERS.has(String(claims.iss));
    const isAudienceValid = claims.aud === env.GOOGLE_CLIENT_ID;
    const isUnexpired = Number(claims.exp) > now - CLOCK_SKEW_SECONDS;
    const isNotFuture = Number(claims.iat) <= now + CLOCK_SKEW_SECONDS;

    if (!isIssuerValid || !isAudienceValid || !isUnexpired || !isNotFuture) {
        return expiredSession;
    }

    // An unverified address can be claimed by someone who does not own it, so
    // it never satisfies the allow list even when the string matches.
    const email = String(claims.email || "").toLowerCase();
    if (claims.email_verified !== true || !email) {
        return {
            ok: false,
            status: 403,
            error: "이메일이 확인되지 않은 계정입니다.",
        };
    }

    if (!getAllowedEmails(env).has(email)) {
        return {
            ok: false,
            status: 403,
            error: "이 계정에는 관리자 권한이 없습니다.",
        };
    }

    return { ok: true, actor: email };
};

const authenticate = async (request, env) => {
    const credential = getBearerCredential(request);
    if (!credential) {
        return { ok: false, status: 401, error: "관리자 로그인이 필요합니다." };
    }

    if (!hasGoogleConfiguration(env)) {
        return {
            ok: false,
            status: 503,
            error: "Worker의 Google 로그인 설정이 필요합니다.",
        };
    }

    return verifyGoogleIdentity(credential, env);
};

// Resolves the operator behind a request. `failure` is a ready response when
// the request must stop; otherwise `actor` is the verified operator email.
const authorize = async (request, env, pathname) => {
    const result = await authenticate(request, env);
    if (result.ok) {
        return { failure: null, actor: result.actor };
    }

    if (env.ADMIN_RATE_LIMITER) {
        const clientAddress =
            request.headers.get("CF-Connecting-IP") || "unknown";
        try {
            const { success } = await env.ADMIN_RATE_LIMITER.limit({
                key: `${pathname}:${clientAddress}`,
            });
            if (!success) {
                return {
                    failure: jsonResponse(
                        request,
                        env,
                        {
                            error: "관리자 접근 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
                        },
                        429,
                    ),
                };
            }
        } catch {
            return {
                failure: jsonResponse(
                    request,
                    env,
                    { error: "관리자 접근 제한 서비스를 확인해주세요." },
                    503,
                ),
            };
        }
    }

    return {
        failure: jsonResponse(
            request,
            env,
            { error: result.error },
            result.status,
        ),
    };
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const getDateRange = (days) => {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    return { start: toIsoDate(start), end: toIsoDate(end) };
};

const createFilter = ({ start, end }, siteTag) =>
    `filter: { date_geq: ${JSON.stringify(start)}, date_leq: ${JSON.stringify(end)}, siteTag: ${JSON.stringify(siteTag)}, bot: 0 }`;

const buildAnalyticsQuery = (env, range) => {
    const accountTag = JSON.stringify(env.CLOUDFLARE_ACCOUNT_ID);
    const filter = createFilter(range, env.CLOUDFLARE_SITE_TAG);

    return `{
        viewer {
            accounts(filter: { accountTag: ${accountTag} }) {
                series: rumPageloadEventsAdaptiveGroups(${filter}, limit: 5000, orderBy: [date_ASC]) {
                    count
                    sum { visits }
                    dimensions { date requestPath }
                }
                topPages: rumPageloadEventsAdaptiveGroups(${filter}, limit: 5000, orderBy: [count_DESC]) {
                    count
                    sum { visits }
                    dimensions { requestPath }
                }
                referrers: rumPageloadEventsAdaptiveGroups(${filter}, limit: 5000, orderBy: [count_DESC]) {
                    count
                    dimensions { refererHost requestPath }
                }
                devices: rumPageloadEventsAdaptiveGroups(${filter}, limit: 5000, orderBy: [count_DESC]) {
                    count
                    dimensions { deviceType requestPath }
                }
                countries: rumPageloadEventsAdaptiveGroups(${filter}, limit: 5000, orderBy: [count_DESC]) {
                    count
                    dimensions { countryName requestPath }
                }
            }
        }
    }`;
};

const isAdminPath = (value) => {
    const path = String(value || "/");
    return path === "/admin" || path.startsWith("/admin/");
};

const aggregatePublicRows = (rows, dimension) => {
    const groups = new Map();

    (rows || [])
        .filter((row) => !isAdminPath(row.dimensions?.requestPath))
        .forEach((row) => {
            const label = row.dimensions?.[dimension] || "";
            const current = groups.get(label) || {
                label,
                pageViews: 0,
                visits: 0,
            };
            current.pageViews += row.count || 0;
            current.visits += row.sum?.visits || 0;
            groups.set(label, current);
        });

    return Array.from(groups.values());
};

const fetchAnalytics = async (env, days) => {
    const range = getDateRange(days);
    const response = await fetch(CLOUDFLARE_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: buildAnalyticsQuery(env, range) }),
    });
    const payload = await response.json();

    if (!response.ok || payload.errors?.length) {
        const message =
            payload.errors?.map((error) => error.message).join("; ") ||
            `Cloudflare API returned ${response.status}`;
        throw new Error(message);
    }

    const result = payload.data?.viewer?.accounts?.[0];
    if (!result) {
        throw new Error("Cloudflare account data was not returned.");
    }

    const series = aggregatePublicRows(result.series, "date").sort((a, b) =>
        a.label.localeCompare(b.label),
    );
    const topPages = aggregatePublicRows(result.topPages, "requestPath").sort(
        (a, b) => b.pageViews - a.pageViews,
    );
    const totals = topPages.reduce(
        (total, row) => ({
            pageViews: total.pageViews + row.pageViews,
            visits: total.visits + row.visits,
        }),
        { pageViews: 0, visits: 0 },
    );

    return {
        range: { days, ...range },
        totals,
        series: series.map((row) => ({
            date: row.label,
            pageViews: row.pageViews,
            visits: row.visits,
        })),
        topPages: topPages.slice(0, 10).map((row) => ({
            path: row.label || "/",
            pageViews: row.pageViews,
            visits: row.visits,
        })),
        referrers: aggregatePublicRows(result.referrers, "refererHost")
            .sort((a, b) => b.pageViews - a.pageViews)
            .slice(0, 10),
        devices: aggregatePublicRows(result.devices, "deviceType")
            .sort((a, b) => b.pageViews - a.pageViews)
            .slice(0, 10),
        countries: aggregatePublicRows(result.countries, "countryName")
            .sort((a, b) => b.pageViews - a.pageViews)
            .slice(0, 10),
        generatedAt: new Date().toISOString(),
    };
};

const hasCloudflareConfiguration = (env) =>
    Boolean(
        env.CLOUDFLARE_API_TOKEN &&
        env.CLOUDFLARE_ACCOUNT_ID &&
        env.CLOUDFLARE_SITE_TAG &&
        env.ADMIN_ORIGIN,
    ) && hasGoogleConfiguration(env);

// ── Publication editing (Google Sheet, mmai_publications tab) ───────────────
//
// Ported from the AAIG admin Worker. MMAI rows live in their own tab of the
// shared AAIG publication spreadsheet. The tab name is fixed here rather than
// configurable, so this Worker can never read or write the AAIG tab.
const MMAI_SHEET_TAB = "mmai_publications";

const hasPublicationSyncConfiguration = (env) =>
    Boolean(
        env.GITHUB_ACTIONS_TOKEN &&
        env.GITHUB_OWNER &&
        env.GITHUB_REPO &&
        env.GITHUB_REF &&
        env.GITHUB_WORKFLOW_ID &&
        env.ADMIN_ORIGIN,
    ) && hasGoogleConfiguration(env);

const GITHUB_API = "https://api.github.com";
// Branch the sync workflow opens its review pull request from. It must match
// `branch` in .github/workflows/publications-sheet-sync.yml.
const PUBLICATION_SYNC_BRANCH = "automation/publications-sheet-sync";

const githubRequest = async (env, path, init = {}) => {
    const owner = encodeURIComponent(env.GITHUB_OWNER);
    const repository = encodeURIComponent(env.GITHUB_REPO);
    const response = await fetch(
        `${GITHUB_API}/repos/${owner}/${repository}${path}`,
        {
            ...init,
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`,
                "Content-Type": "application/json",
                "User-Agent": "MMAI-Admin-Worker",
                "X-GitHub-Api-Version": "2026-03-10",
            },
        },
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const failure = new Error(
            payload.message || `GitHub API returned ${response.status}`,
        );
        failure.status = response.status;
        throw failure;
    }
    return payload;
};

const summarizeRun = (run) =>
    run
        ? {
              status: run.status,
              conclusion: run.conclusion,
              event: run.event,
              createdAt: run.created_at,
              updatedAt: run.updated_at,
              url: run.html_url,
          }
        : null;

const fetchLatestRun = async (env, workflowId) => {
    const runs = await githubRequest(
        env,
        `/actions/workflows/${encodeURIComponent(workflowId)}/runs?per_page=1`,
    );
    return summarizeRun(runs.workflow_runs?.[0]);
};

const dispatchPublicationSync = async (env) => {
    const workflow = encodeURIComponent(env.GITHUB_WORKFLOW_ID);
    const payload = await githubRequest(
        env,
        `/actions/workflows/${workflow}/dispatches`,
        {
            method: "POST",
            body: JSON.stringify({
                ref: env.GITHUB_REF,
                inputs: { allow_large_deletion: "false" },
            }),
        },
    );

    return {
        message: "Publication 동기화 요청을 접수했습니다.",
        runUrl:
            payload.html_url ||
            `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW_ID}`,
    };
};

const fetchPublicationSyncStatus = async (env) => {
    const head = encodeURIComponent(
        `${env.GITHUB_OWNER}:${PUBLICATION_SYNC_BRANCH}`,
    );
    const [run, pulls] = await Promise.all([
        fetchLatestRun(env, env.GITHUB_WORKFLOW_ID),
        githubRequest(env, `/pulls?state=open&head=${head}&per_page=1`),
    ]);
    const pull = Array.isArray(pulls) ? pulls[0] : null;

    return {
        run,
        pullRequest: pull
            ? {
                  number: pull.number,
                  title: pull.title,
                  updatedAt: pull.updated_at,
                  url: pull.html_url,
              }
            : null,
    };
};

// A saved row is already safe in the sheet, so a failed dispatch is reported
// rather than raised: the daily scheduled sync still picks the change up.
const startSyncAfterEdit = async (env) => {
    if (!hasPublicationSyncConfiguration(env)) {
        return {
            started: false,
            message:
                "자동 동기화가 설정되지 않아 매일 예약된 동기화 때 반영됩니다.",
        };
    }

    try {
        const result = await dispatchPublicationSync(env);
        return { started: true, runUrl: result.runUrl };
    } catch (error) {
        return {
            started: false,
            message:
                "동기화를 시작하지 못했습니다. 매일 예약된 동기화 때 반영됩니다.",
            detail: error.message,
        };
    }
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const MAX_EDIT_BODY_BYTES = 32 * 1024;
const MAX_CELL_LENGTH = 5000;
const PUBLICATION_ROW_PATH = /^\/v1\/publications\/rows\/(\d+)$/;
const PUBLICATION_CATEGORIES = new Set(RESEARCH_CATALOG.meta?.area_order ?? []);

let sheetsTokenCache = { token: "", expiresAt: 0 };

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// The whole service account JSON key is stored as one secret, so rotating
// the key is a single `wrangler secret put`.
const readServiceAccount = (env) => {
    try {
        const key = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY || "");
        return key.client_email && key.private_key ? key : null;
    } catch {
        return null;
    }
};

const hasPublicationEditConfiguration = (env) =>
    Boolean(
        env.PUBLICATIONS_SHEET_ID &&
        readServiceAccount(env) &&
        env.ADMIN_ORIGIN,
    ) && hasGoogleConfiguration(env);

const encodeBase64Url = (input) => {
    const bytes =
        typeof input === "string"
            ? new TextEncoder().encode(input)
            : new Uint8Array(input);
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
};

const importServiceAccountKey = (pem) =>
    crypto.subtle.importKey(
        "pkcs8",
        decodeBase64Url(
            String(pem)
                .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
                .replace(/\s+/g, ""),
        ),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"],
    );

// Service account OAuth: a self-signed JWT is exchanged for a short-lived
// access token, which is reused until a minute before it expires.
const getSheetsAccessToken = async (env) => {
    if (sheetsTokenCache.expiresAt > Date.now() + 60_000) {
        return sheetsTokenCache.token;
    }

    const account = readServiceAccount(env);
    const now = Math.floor(Date.now() / 1000);
    const unsignedToken = [
        encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
        encodeBase64Url(
            JSON.stringify({
                iss: account.client_email,
                scope: SHEETS_SCOPE,
                aud: GOOGLE_TOKEN_URL,
                iat: now,
                exp: now + 3600,
            }),
        ),
    ].join(".");
    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        await importServiceAccountKey(account.private_key),
        new TextEncoder().encode(unsignedToken),
    );

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: `${unsignedToken}.${encodeBase64Url(signature)}`,
        }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
        throw new Error(
            payload.error_description ||
                payload.error ||
                `Google token endpoint returned ${response.status}`,
        );
    }

    sheetsTokenCache = {
        token: payload.access_token,
        expiresAt: Date.now() + (Number(payload.expires_in) || 3600) * 1000,
    };
    return payload.access_token;
};

const sheetRange = (cells) => `'${MMAI_SHEET_TAB}'!${cells}`;

const sheetsRequest = async (env, path, init = {}) => {
    const token = await getSheetsAccessToken(env);
    const response = await fetch(
        `${SHEETS_API}/${encodeURIComponent(env.PUBLICATIONS_SHEET_ID)}${path}`,
        {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        },
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            payload.error?.message ||
                `Google Sheets API returned ${response.status}`,
        );
    }
    return payload;
};

const columnLetter = (index) => {
    let remaining = index + 1;
    let letters = "";
    while (remaining > 0) {
        const offset = (remaining - 1) % 26;
        letters = String.fromCharCode(65 + offset) + letters;
        remaining = Math.floor((remaining - 1) / 26);
    }
    return letters;
};

const pickRowValues = (header, cells) =>
    Object.fromEntries(
        PUBLICATION_SHEET_COLUMNS.map((column) => {
            const index = header.indexOf(column);
            return [column, index >= 0 ? String(cells[index] ?? "") : ""];
        }),
    );

// Rows are located by the header, never by a fixed column order, so an
// operator can reorder or add columns in the sheet without breaking edits.
const readPublicationSheet = async (env) => {
    const payload = await sheetsRequest(
        env,
        `/values/${encodeURIComponent(sheetRange("A1:ZZ"))}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
    );
    const values = payload.values ?? [];
    const header = (values[0] ?? []).map((cell) =>
        String(cell ?? "")
            .trim()
            .toLowerCase(),
    );
    const missingColumns = PUBLICATION_SHEET_REQUIRED_COLUMNS.filter(
        (column) => !header.includes(column),
    );
    if (missingColumns.length > 0) {
        throw new HttpError(
            502,
            `Sheet 첫 행에 필요한 열이 없습니다: ${missingColumns.join(", ")}`,
        );
    }

    const rows = values
        .slice(1)
        .map((cells, index) => {
            const rowCells = cells.map((cell) => String(cell ?? ""));
            return {
                rowNumber: index + 2,
                cells: rowCells,
                values: pickRowValues(header, rowCells),
            };
        })
        .filter((row) => row.cells.some((cell) => cell.trim()));

    return { header, rows };
};

const normalizeSubmittedRow = (input) =>
    Object.fromEntries(
        PUBLICATION_SHEET_COLUMNS.map((column) => {
            const value = String(input?.[column] ?? "")
                .replace(/\r\n?/g, "\n")
                .trim();
            if (value.length > MAX_CELL_LENGTH) {
                throw new HttpError(
                    413,
                    `"${column}" 값이 너무 깁니다. ${MAX_CELL_LENGTH}자 이하로 줄여주세요.`,
                );
            }
            return [column, value];
        }),
    );

const rowMatchesExpected = (expected, current) =>
    Boolean(expected) &&
    PUBLICATION_SHEET_COLUMNS.every(
        (column) =>
            String(expected[column] ?? "").trim() ===
            String(current[column] ?? "").trim(),
    );

// Columns the editor does not manage keep whatever the sheet already holds.
const buildRowCells = (header, existingCells, values) =>
    header.map((column, index) =>
        PUBLICATION_SHEET_COLUMNS.includes(column)
            ? values[column]
            : (existingCells[index] ?? ""),
    );

const readJsonBody = async (request) => {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_EDIT_BODY_BYTES) {
        throw new HttpError(413, "요청 내용이 너무 큽니다.");
    }
    try {
        return JSON.parse(text);
    } catch {
        throw new HttpError(400, "요청 형식이 올바르지 않습니다.");
    }
};

// Values are written RAW so dates stay text and nothing an operator types is
// ever evaluated as a spreadsheet formula.
const writeSheetRow = async (env, header, rowNumber, cells) => {
    const lastColumn = columnLetter(header.length - 1);

    if (rowNumber) {
        const range = sheetRange(`A${rowNumber}:${lastColumn}${rowNumber}`);
        await sheetsRequest(
            env,
            `/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
            {
                method: "PUT",
                body: JSON.stringify({
                    range,
                    majorDimension: "ROWS",
                    values: [cells],
                }),
            },
        );
        return rowNumber;
    }

    const payload = await sheetsRequest(
        env,
        `/values/${encodeURIComponent(sheetRange(`A1:${lastColumn}1`))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
            method: "POST",
            body: JSON.stringify({ majorDimension: "ROWS", values: [cells] }),
        },
    );
    const appendedRow = Number(
        /![A-Z]+(\d+)/.exec(payload.updates?.updatedRange || "")?.[1],
    );
    return Number.isFinite(appendedRow) ? appendedRow : null;
};

// Google's error text is English and technical, so the common setup mistakes
// are translated into the step an operator has to fix.
const describeSheetError = (message) => {
    const text = String(message || "");
    if (/has not been used|is disabled|SERVICE_DISABLED/i.test(text)) {
        return "Google Cloud 프로젝트에서 Google Sheets API를 사용 설정해주세요.";
    }
    if (/permission|PERMISSION_DENIED|forbidden/i.test(text)) {
        return "서비스 계정 이메일을 Sheet 공유 설정에 편집자로 추가해주세요.";
    }
    if (/Unable to parse range/i.test(text)) {
        return `Sheet에 ${MMAI_SHEET_TAB} 탭이 있는지 확인해주세요.`;
    }
    if (
        /invalid_grant|invalid_client|Invalid JWT|account not found/i.test(text)
    ) {
        return "서비스 계정 키가 올바른지, 삭제되지 않았는지 확인해주세요.";
    }
    if (/Requested entity was not found|NOT_FOUND/i.test(text)) {
        return "wrangler.toml의 PUBLICATIONS_SHEET_ID가 Sheet 주소와 같은지 확인해주세요.";
    }
    return "";
};

const handlePublicationRows = async (request, env, url) => {
    const rowMatch = PUBLICATION_ROW_PATH.exec(url.pathname);
    const isList = !rowMatch && request.method === "GET";
    const isCreate = !rowMatch && request.method === "POST";
    const isUpdate = Boolean(rowMatch) && request.method === "PUT";

    if (!isList && !isCreate && !isUpdate) {
        return jsonResponse(
            request,
            env,
            { error: "허용되지 않은 요청 방식입니다." },
            405,
        );
    }

    if (!hasPublicationEditConfiguration(env)) {
        return jsonResponse(
            request,
            env,
            {
                error: "Publication 편집 설정이 필요합니다.",
                setupRequired: true,
            },
            503,
        );
    }

    const { failure, actor } = await authorize(
        request,
        env,
        "/v1/publications/rows",
    );
    if (failure) return failure;

    try {
        if (isList) {
            const sheet = await readPublicationSheet(env);
            return jsonResponse(request, env, {
                rows: sheet.rows.map(({ rowNumber, values }) => ({
                    rowNumber,
                    values,
                })),
                readAt: new Date().toISOString(),
            });
        }

        const submission = await readJsonBody(request);
        const values = normalizeSubmittedRow(submission?.values);
        const sheet = await readPublicationSheet(env);
        let target = null;

        if (isUpdate) {
            const rowNumber = Number(rowMatch[1]);
            target = sheet.rows.find((row) => row.rowNumber === rowNumber);
            // The sheet stays editable by hand, so a row is only overwritten
            // when it still holds exactly what the operator started from.
            if (
                !target ||
                !rowMatchesExpected(submission?.expected, target.values)
            ) {
                throw new HttpError(
                    409,
                    "그 사이 Sheet에서 이 행이 바뀌었습니다. 목록을 새로 불러온 뒤 다시 수정해주세요.",
                );
            }
            // The id ties a paper to its figure and News, so the editor never
            // changes it. A row typed by hand without one keeps it blank; the
            // sync then reuses the id its title already has on the site.
            values.id = target.values.id.trim();
        } else if (!values.id) {
            values.id = suggestPublicationId(
                values,
                sheet.rows.map((row) => row.values),
            );
        }

        const fieldErrors = validateSheetRowForSave(values, {
            categories: PUBLICATION_CATEGORIES,
        });
        const titleKey = toSlug(values.title);
        const others = sheet.rows.filter((row) => row !== target);
        const duplicateTitle = others.find(
            (row) => titleKey && toSlug(row.values.title) === titleKey,
        );
        if (duplicateTitle) {
            fieldErrors.push({
                field: "title",
                message: `같은 제목이 이미 Sheet ${duplicateTitle.rowNumber}행에 있습니다.`,
            });
        }
        const duplicateId =
            values.id &&
            others.find((row) => row.values.id.trim() === values.id);
        if (duplicateId) {
            fieldErrors.push({
                field: "id",
                message: `같은 ID가 이미 Sheet ${duplicateId.rowNumber}행에 있습니다.`,
            });
        }
        if (fieldErrors.length > 0) {
            return jsonResponse(
                request,
                env,
                { error: "입력값을 확인해주세요.", fieldErrors },
                422,
            );
        }

        const cells = buildRowCells(sheet.header, target?.cells ?? [], values);
        const rowNumber = await writeSheetRow(
            env,
            sheet.header,
            target?.rowNumber ?? null,
            cells,
        );

        // Sheet revision history shows the service account as the editor, so
        // the Worker log is where the operator behind each change is kept.
        console.log(
            JSON.stringify({
                event: isUpdate ? "publication.updated" : "publication.created",
                actor,
                rowNumber,
                id: values.id,
                title: values.title,
                at: new Date().toISOString(),
            }),
        );

        return jsonResponse(
            request,
            env,
            {
                row: { rowNumber, values: pickRowValues(sheet.header, cells) },
                sync: await startSyncAfterEdit(env),
            },
            isUpdate ? 200 : 201,
        );
    } catch (error) {
        if (error instanceof HttpError) {
            return jsonResponse(
                request,
                env,
                { error: error.message },
                error.status,
            );
        }
        console.error(
            JSON.stringify({
                event: "publication.sheet_error",
                actor,
                message: error.message,
            }),
        );
        return jsonResponse(
            request,
            env,
            {
                error: "Google Sheet에 연결하지 못했습니다.",
                hint: describeSheetError(error.message),
                detail: error.message,
            },
            502,
        );
    }
};

export default {
    async fetch(request, env) {
        if (!isAllowedOrigin(request, env)) {
            return jsonResponse(
                request,
                env,
                { error: "허용되지 않은 요청입니다." },
                403,
            );
        }

        if (request.method === "OPTIONS") {
            return jsonResponse(request, env, {}, 204);
        }

        const url = new URL(request.url);
        if (request.method === "GET" && url.pathname === "/health") {
            return jsonResponse(request, env, {
                ok: true,
                configured: hasCloudflareConfiguration(env),
                googleSignInConfigured: hasGoogleConfiguration(env),
                publicationEditingConfigured:
                    hasPublicationEditConfiguration(env),
                publicationSyncConfigured: hasPublicationSyncConfiguration(env),
            });
        }

        if (request.method === "GET" && url.pathname === "/v1/analytics") {
            if (!hasCloudflareConfiguration(env)) {
                return jsonResponse(
                    request,
                    env,
                    { error: "Worker 환경변수 설정이 필요합니다." },
                    503,
                );
            }

            const { failure } = await authorize(request, env, url.pathname);
            if (failure) return failure;

            const requestedDays = Number(url.searchParams.get("days") || 30);
            const days = ALLOWED_PERIODS.has(requestedDays)
                ? requestedDays
                : 30;

            try {
                const analytics = await fetchAnalytics(env, days);
                return jsonResponse(request, env, analytics);
            } catch (error) {
                // Upstream GraphQL message only (no credentials), so the
                // cause of a failed query can be read from the Worker log.
                console.error("Cloudflare analytics query failed:", error.message);
                return jsonResponse(
                    request,
                    env,
                    {
                        error: "Cloudflare 통계를 불러오지 못했습니다.",
                        detail: error.message,
                    },
                    502,
                );
            }
        }

        if (
            url.pathname === "/v1/publications/rows" ||
            PUBLICATION_ROW_PATH.test(url.pathname)
        ) {
            return handlePublicationRows(request, env, url);
        }

        if (
            ["GET", "POST"].includes(request.method) &&
            url.pathname === "/v1/publications/sync"
        ) {
            if (!hasPublicationSyncConfiguration(env)) {
                return jsonResponse(
                    request,
                    env,
                    { error: "Publication 동기화 설정이 필요합니다." },
                    503,
                );
            }

            const { failure } = await authorize(request, env, url.pathname);
            if (failure) return failure;

            try {
                return request.method === "GET"
                    ? jsonResponse(
                          request,
                          env,
                          await fetchPublicationSyncStatus(env),
                      )
                    : jsonResponse(
                          request,
                          env,
                          await dispatchPublicationSync(env),
                          202,
                      );
            } catch (error) {
                return jsonResponse(
                    request,
                    env,
                    {
                        error:
                            request.method === "GET"
                                ? "동기화 상태를 불러오지 못했습니다."
                                : "Publication 동기화를 시작하지 못했습니다.",
                        // 404: the workflow file is not on GITHUB_REF yet;
                        // 401/403: the token is wrong, expired or too narrow.
                        hint:
                            error.status === 404
                                ? `${env.GITHUB_WORKFLOW_ID}가 ${env.GITHUB_REF} 브랜치에 있는지 확인해주세요(커밋·push 전이면 생기지 않습니다).`
                                : [401, 403].includes(error.status)
                                  ? "Worker의 GITHUB_ACTIONS_TOKEN이 유효하고 Actions 권한이 있는지 확인해주세요."
                                  : "",
                        detail: error.message,
                    },
                    502,
                );
            }
        }

        return jsonResponse(
            request,
            env,
            { error: "요청 경로를 찾을 수 없습니다." },
            404,
        );
    },
};
