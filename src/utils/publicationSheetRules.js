// Publication rules shared by the content pipeline, the admin Worker and the
// admin editor, so a row the editor accepts is a row the nightly sync accepts.
// Keep this module free of Node, browser and Worker specific APIs.
//
// Ported from the AAIG site. MMAI keeps its own tab in the same spreadsheet,
// so the columns differ: no `labs`, an extra `accepted_date`, and venues are
// written as full names instead of an approved "<abbr> <year>" list.

export const PUBLICATION_SHEET_COLUMNS = [
    "enabled",
    "id",
    "category",
    "status",
    "title",
    "date",
    "accepted_date",
    "authors",
    "venue",
    "keywords",
    "pdf_url",
    "arxiv_url",
    "github_url",
    "project_url",
    "featured",
    "summary",
    "notes",
];

export const PUBLICATION_SHEET_REQUIRED_COLUMNS =
    PUBLICATION_SHEET_COLUMNS.filter((column) => column !== "notes");

export const PUBLICATION_URL_COLUMNS = [
    "pdf_url",
    "arxiv_url",
    "github_url",
    "project_url",
];

export const PUBLICATION_STATUSES = ["published", "working", "project"];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const SHEET_TRUE_VALUES = new Set([
    "true",
    "yes",
    "y",
    "1",
    "사용",
    "게시",
]);
export const SHEET_FALSE_VALUES = new Set([
    "false",
    "no",
    "n",
    "0",
    "미사용",
    "비게시",
]);

export const toSlug = (value) =>
    String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

// Keywords are written "A | B" in the sheet; commas are accepted too because
// the original Markdown files listed them that way.
export const splitSheetList = (value) =>
    String(value ?? "")
        .trim()
        .split(/\s*[|,]\s*|\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

export const isCalendarDate = (value) => {
    if (!ISO_DATE_PATTERN.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    );
};

const isHttpUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const isSheetBoolean = (value) => {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase();
    return (
        !normalized ||
        SHEET_TRUE_VALUES.has(normalized) ||
        SHEET_FALSE_VALUES.has(normalized)
    );
};

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Checks one sheet row given as { column: text }. Returns a list of
// { field, message } in the order the columns appear, empty when the row is
// valid. Messages are written for operators, not developers.
export const validatePublicationSheetRow = (record, { categories }) => {
    const value = (column) => String(record?.[column] ?? "").trim();
    const errors = [];
    const fail = (field, message) => errors.push({ field, message });

    ["enabled", "featured"].forEach((column) => {
        if (!isSheetBoolean(record?.[column])) {
            fail(column, "TRUE 또는 FALSE만 입력할 수 있습니다.");
        }
    });

    const id = value("id");
    if (id && !ID_PATTERN.test(id)) {
        fail("id", "ID는 영문 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다.");
    }

    if (!categories.has(value("category"))) {
        fail("category", "연구 분야를 목록에서 선택해주세요.");
    }

    const status = value("status") || "published";
    if (!PUBLICATION_STATUSES.includes(status)) {
        fail("status", "published, working, project 중 하나여야 합니다.");
    }

    const title = value("title");
    if (!title) {
        fail("title", "제목을 입력해주세요.");
    } else if (!id && !toSlug(title)) {
        fail("title", "제목에 영문자나 숫자가 하나 이상 있어야 합니다.");
    }

    const date = value("date");
    if (!date) {
        fail("date", "날짜를 입력해주세요.");
    } else if (!isCalendarDate(date)) {
        fail("date", "날짜는 2026-03-01처럼 YYYY-MM-DD 형식이어야 합니다.");
    }

    const acceptedDate = value("accepted_date");
    if (acceptedDate && !isCalendarDate(acceptedDate)) {
        fail(
            "accepted_date",
            "날짜는 2026-03-01처럼 YYYY-MM-DD 형식이어야 합니다.",
        );
    }

    if (!value("authors")) {
        fail("authors", "저자를 입력해주세요.");
    }

    if (!value("venue")) {
        fail("venue", "학회나 저널을 입력해주세요.");
    }

    PUBLICATION_URL_COLUMNS.forEach((column) => {
        const url = value(column);
        if (url && !isHttpUrl(url)) {
            fail(column, "http:// 또는 https://로 시작하는 주소여야 합니다.");
        }
    });

    return errors;
};

// A blank enabled cell counts as enabled, matching the nightly sync.
export const isSheetRowEnabled = (record) =>
    !SHEET_FALSE_VALUES.has(
        String(record?.enabled ?? "")
            .trim()
            .toLowerCase(),
    );

// Hidden rows are skipped by the sync, so only their title is required;
// that is what lets an operator park an incomplete entry.
export const validateSheetRowForSave = (record, options) => {
    if (isSheetRowEnabled(record)) {
        return validatePublicationSheetRow(record, options);
    }
    return String(record?.title ?? "").trim()
        ? []
        : [{ field: "title", message: "제목을 입력해주세요." }];
};

// Converts a structured publication (the generated data or the snapshot)
// into the sheet's column values.
export const publicationItemToSheetValues = (item) => {
    const meta = item?.research_meta ?? {};
    return {
        enabled: "TRUE",
        id: String(item?.id ?? ""),
        category: String(item?.category ?? ""),
        status: String(item?.status || "published"),
        title: String(item?.title ?? ""),
        date: String(meta.published_date ?? ""),
        accepted_date: String(meta.accepted_date ?? ""),
        authors: String(meta.author ?? ""),
        venue: String(meta.published_place ?? ""),
        keywords: (meta.keywords ?? []).join(" | "),
        pdf_url: String(meta.pdf_link ?? ""),
        arxiv_url: String(meta.arxiv_link ?? ""),
        github_url: String(meta.github_link ?? ""),
        project_url: String(meta.project_link ?? ""),
        featured: item?.featured ? "TRUE" : "FALSE",
        summary: String(item?.summary ?? ""),
        notes: "",
    };
};

// MMAI ids read "<area prefix>-<year>-<first six title words>", e.g.
// core-2026-recalibrated-contrastive-loss-vlm. The prefix is whichever one
// the area's existing ids use most, so new papers sit next to old ones.
// `existing` is a list of { id, category }.
export const suggestPublicationId = (values, existing = []) => {
    const category = String(values?.category ?? "");
    const counts = new Map();
    existing.forEach((item) => {
        if (item.category !== category || !item.id) return;
        const prefix = String(item.id).split("-")[0];
        counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    });
    const prefix =
        [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
        category.split("_")[0] ||
        "pub";
    const year = /^\d{4}/.exec(String(values?.date ?? ""))?.[0] ?? "";
    const words = toSlug(values?.title).split("-").filter(Boolean).slice(0, 6);
    const base = [prefix, year, ...words].filter(Boolean).join("-");

    const taken = new Set(existing.map((item) => item.id));
    let id = base;
    for (let suffix = 2; taken.has(id); suffix += 1) {
        id = `${base}-${suffix}`;
    }
    return id;
};

// Sheet columns compared with the site, with the label the admin page shows.
const COMPARED_FIELDS = [
    ["title", "제목"],
    ["category", "연구 분야"],
    ["status", "상태"],
    ["date", "게재일"],
    ["accepted_date", "채택일"],
    ["authors", "저자"],
    ["venue", "학회·저널"],
    ["keywords", "키워드"],
    ["pdf_url", "PDF"],
    ["arxiv_url", "arXiv"],
    ["github_url", "GitHub"],
    ["project_url", "프로젝트"],
    ["featured", "대표 강조"],
    ["summary", "요약"],
];

const normalizeForCompare = (column, value) => {
    const text = String(value ?? "").trim();
    if (column === "keywords") return splitSheetList(text).join(" | ");
    if (column === "featured")
        return text.toLowerCase() === "true" ? "TRUE" : "";
    if (column === "status") return text || "published";
    return text;
};

// Sheet rows and site items are matched by id; a row without an id is new
// until the sync gives it one.
export const findPendingSheetChanges = (rows, siteItems) => {
    const siteById = new Map(siteItems.map((item) => [item.id, item]));
    const shownIds = new Set();
    const changes = [];

    rows.forEach((row) => {
        if (!isSheetRowEnabled(row.values)) return;
        const id = row.values.id.trim();
        const siteItem = id ? siteById.get(id) : null;
        if (id) shownIds.add(id);

        if (!siteItem) {
            changes.push({ kind: "added", row, values: row.values });
            return;
        }
        const siteValues = publicationItemToSheetValues(siteItem);
        const fields = COMPARED_FIELDS.filter(
            ([column]) =>
                normalizeForCompare(column, row.values[column]) !==
                normalizeForCompare(column, siteValues[column]),
        ).map(([, label]) => label);
        if (fields.length > 0) {
            changes.push({ kind: "changed", row, values: row.values, fields });
        }
    });

    siteItems.forEach((item) => {
        if (shownIds.has(item.id)) return;
        const hiddenRow = rows.find((row) => row.values.id.trim() === item.id);
        changes.push({
            kind: "removed",
            row: hiddenRow ?? null,
            values: publicationItemToSheetValues(item),
        });
    });

    return changes;
};
