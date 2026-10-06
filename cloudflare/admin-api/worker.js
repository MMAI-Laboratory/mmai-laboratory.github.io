// MMAI Lab admin API (Cloudflare Worker).
//
// Serves aggregated Cloudflare Web Analytics numbers to the private /admin
// page. Every data request must carry a Google ID token for an address on the
// ADMIN_ALLOWED_EMAILS allow list; the Worker verifies the token's signature
// itself, so the Cloudflare API token never leaves this Worker.
//
// Adapted from the AAIG admin Worker (analytics + Google sign-in only; MMAI
// keeps publications as Markdown in the repository, so there is no Sheet API).

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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
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

        return jsonResponse(
            request,
            env,
            { error: "요청 경로를 찾을 수 없습니다." },
            404,
        );
    },
};
