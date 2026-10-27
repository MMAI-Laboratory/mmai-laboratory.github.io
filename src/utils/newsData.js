import NEWS_DATA from "../generated/news.generated.json";

const DEFAULT_NEWS_TYPE_META = {
    all: { label: "All" },
    paper_accepted: { label: "Paper accepted" },
    new_member: { label: "New menbers" },
    graduation: { label: "Graduation" },
    award: { label: "Award" },
    notice: { label: "Notice" },
};

const NEWS_TYPE_ORDER = [
    "paper_accepted",
    "new_member",
    "graduation",
    "award",
    "notice",
];

const normalizeNewsType = (value) => {
    const raw = normalizeText(value).toLowerCase();

    if (!raw) {
        return "notice";
    }

    if (raw === "paper_accepted") {
        return "paper_accepted";
    }
    if (raw === "new_member") {
        return "new_member";
    }
    if (raw === "graduation") {
        return "graduation";
    }
    if (raw === "award") {
        return "award";
    }

    return "notice";
};

const normalizeText = (value) =>
    typeof value === "string" ? value.trim() : "";
const normalizeBoolean = (value) => value === true;

const parseDate = (value) => {
    const raw = normalizeText(value);
    if (!raw) {
        return new Date("1970-01-01T00:00:00");
    }

    const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
    const parsed = new Date(isoDate);

    if (Number.isNaN(parsed.getTime())) {
        return new Date("1970-01-01T00:00:00");
    }

    return parsed;
};

const extractYear = (value, fallbackDate) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }

    return fallbackDate.getFullYear();
};

const normalizeLegacyNewsItems = (items) =>
    items.map((entry, index) => {
        const item = entry?.news ?? entry ?? {};
        const parsedDate = parseDate(item.date);

        return {
            id: normalizeText(item.id) || `legacy-news-${index + 1}`,
            type: "paper_accepted",
            title: normalizeText(item.title) || "Paper Accepted",
            summary:
                normalizeText(item.summary) ||
                normalizeText(item.desc) ||
                "Publication update from MMAI Lab.",
            date: normalizeText(item.date) || "1970-01-01",
            year: extractYear(item.year, parsedDate),
            related_person: "",
            venue:
                normalizeText(item.venue) ||
                normalizeText(item.published_place) ||
                "",
            external_url:
                normalizeText(item.external_url) ||
                normalizeText(item.url) ||
                normalizeText(item.link) ||
                "",
            internal_slug: normalizeText(item.internal_slug),
            is_external: Boolean(item.url || item.link || item.external_url),
            featured: normalizeBoolean(item.featured),
            _parsedDate: parsedDate,
        };
    });

const normalizeStructuredNewsItems = (items) =>
    items.map((item, index) => {
        const parsedDate = parseDate(item?.date);
        const externalUrl = normalizeText(item?.external_url);

        return {
            id: normalizeText(item?.id) || `news-${index + 1}`,
            type: normalizeNewsType(item?.type),
            title: normalizeText(item?.title) || "Lab Update",
            summary: normalizeText(item?.summary) || "Update from MMAI Lab.",
            date: normalizeText(item?.date) || "1970-01-01",
            year: extractYear(item?.year, parsedDate),
            related_person: normalizeText(item?.related_person),
            venue: normalizeText(item?.venue),
            external_url: externalUrl,
            internal_slug: normalizeText(item?.internal_slug),
            is_external:
                normalizeBoolean(item?.is_external) && Boolean(externalUrl),
            featured: normalizeBoolean(item?.featured),
            // Missing means shown, so older generated data keeps working.
            show_on_home: item?.show_on_home !== false,
            publication_id: normalizeText(item?.publication_id),
            publication_title: normalizeText(item?.publication_title),
            publication_query: normalizeText(item?.publication_query),
            generated_from: normalizeText(item?.generated_from),
            _parsedDate: parsedDate,
        };
    });

const toNewsItems = () => {
    if (Array.isArray(NEWS_DATA)) {
        return normalizeLegacyNewsItems(NEWS_DATA);
    }

    return normalizeStructuredNewsItems(NEWS_DATA?.items ?? []);
};

const typeMetaFromDataset = NEWS_DATA?.meta?.type_labels ?? {};

export const NEWS_TYPE_META = {
    ...DEFAULT_NEWS_TYPE_META,
    ...Object.entries(typeMetaFromDataset).reduce((acc, [key, label]) => {
        const normalizedType = normalizeNewsType(key);
        const fallbackLabel =
            DEFAULT_NEWS_TYPE_META[normalizedType]?.label || normalizedType;

        acc[normalizedType] = {
            label: normalizeText(label) || fallbackLabel,
        };
        return acc;
    }, {}),
};

export const getNewsTypeMeta = (type) =>
    NEWS_TYPE_META[type] ?? {
        label: type
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
    };

export const isValidExternalUrl = (value) => {
    const url = normalizeText(value);
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
        return false;
    }
};

export const getAllNewsItems = () =>
    toNewsItems()
        .sort((a, b) => b._parsedDate - a._parsedDate)
        .map((item) => {
            const normalizedItem = { ...item };
            delete normalizedItem._parsedDate;
            return normalizedItem;
        });

// Home page Latest News: newest items, skipping those marked to stay off home.
export const getLatestNewsItems = (limit = 5) =>
    getAllNewsItems()
        .filter((item) => item.show_on_home !== false)
        .slice(0, limit);

export const getNewsTypes = () => {
    return ["all", ...NEWS_TYPE_ORDER];
};

export const formatNewsDate = (date) =>
    new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(parseDate(date));
