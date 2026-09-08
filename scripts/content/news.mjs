import path from "node:path";
import { promises as fs } from "node:fs";
import {
    NEWS_CONTENT_DIR,
    NEWS_GENERATED_FILE,
    getNowIso,
    isIsoDate,
    listMarkdownFiles,
    normalizeHttpUrl,
    normalizeSlug,
    parseMarkdownFrontmatter,
    relativeFromRoot,
    toYear,
    writeJsonFile,
} from "./lib.mjs";
import { syncPublicationContent } from "./publications.mjs";

const NEWS_TYPES = new Set([
    "paper_accepted",
    "notice",
    "equipment",
    "new_member",
    "graduation",
    "seminar",
    "award",
    "visit",
    "workshop",
    "general",
]);

const TYPE_LABELS = {
    paper_accepted: "Paper Accepted",
    notice: "Notice",
    equipment: "Equipment",
    new_member: "New Member",
    graduation: "Graduation",
    seminar: "Seminar / Talk",
    award: "Award",
    visit: "Visit / Collaboration",
    workshop: "Workshop",
    general: "General Update",
};

const PAPER_ACCEPTED_TYPE = "paper_accepted";
const AUTO_PUBLICATION_SOURCE = "publications-auto";

const normalizeText = (value) => String(value ?? "").trim();

const isGenericPaperAcceptedTitle = (value) =>
    /^paper\s+accepted\b/i.test(normalizeText(value));

const normalizePaperKey = (date, title) =>
    `${normalizeText(date)}::${normalizeSlug(title)}`;

const requiredError = (filePath, fieldName, message = "is required") =>
    `[news] ${relativeFromRoot(filePath)}: "${fieldName}" ${message}`;

const validateType = (value, filePath) => {
    const type = normalizeText(value);
    if (!type) {
        throw new Error(requiredError(filePath, "type"));
    }
    if (!NEWS_TYPES.has(type)) {
        throw new Error(
            `[news] ${relativeFromRoot(filePath)}: unsupported type "${type}". Allowed: ${Array.from(NEWS_TYPES).join(", ")}`,
        );
    }
    return type;
};

const parseNewsFile = async (filePath) => {
    const raw = await fs.readFile(filePath, "utf8");
    const { data, body } = parseMarkdownFrontmatter(raw, filePath);
    const id =
        normalizeText(data.id) || normalizeSlug(path.basename(filePath, ".md"));
    const title = normalizeText(data.title);
    const date = normalizeText(data.date);
    const type = validateType(data.type, filePath);
    const summary =
        normalizeText(data.summary) || body.split("\n")[0]?.trim() || "";
    const venue = normalizeText(data.venue);
    const relatedPerson = normalizeText(data.related_person);
    const externalUrl = normalizeHttpUrl(data.external_url);
    const internalSlug =
        normalizeText(data.internal_slug) || normalizeSlug(id || title);
    const isExternal = data.is_external === true || Boolean(externalUrl);
    const featured = data.featured === true;
    const publicationId = normalizeText(data.publication_id);
    const publicationTitle = normalizeText(data.publication_title);
    const publicationQueryInput = normalizeText(data.publication_query);
    const publicationQuery =
        publicationQueryInput ||
        publicationTitle ||
        (type === PAPER_ACCEPTED_TYPE && !isGenericPaperAcceptedTitle(title)
            ? title
            : "");

    if (!id) {
        throw new Error(requiredError(filePath, "id"));
    }
    if (!title) {
        throw new Error(requiredError(filePath, "title"));
    }
    if (!date) {
        throw new Error(requiredError(filePath, "date"));
    }
    if (!isIsoDate(date)) {
        throw new Error(
            `[news] ${relativeFromRoot(filePath)}: "date" must be YYYY-MM-DD (received "${date}")`,
        );
    }
    if (!summary) {
        throw new Error(requiredError(filePath, "summary"));
    }
    if (isExternal && !externalUrl) {
        throw new Error(
            `[news] ${relativeFromRoot(filePath)}: external item requires a valid "external_url"`,
        );
    }

    return {
        id,
        type,
        title,
        summary,
        date,
        year: toYear(date),
        related_person: relatedPerson,
        venue,
        external_url: externalUrl,
        internal_slug: internalSlug,
        is_external: isExternal,
        featured,
        publication_id: publicationId,
        publication_title: publicationTitle,
        publication_query: publicationQuery,
        generated_from: "",
    };
};

const createAutoPublicationNewsItem = (publicationItem) => {
    const publicationId = normalizeText(publicationItem.id);
    const publicationTitle = normalizeText(publicationItem.title);
    const publicationSummary = normalizeText(publicationItem.summary);
    const publicationDate = normalizeText(
        publicationItem.research_meta?.published_date,
    );
    const publicationVenue = normalizeText(
        publicationItem.research_meta?.published_place,
    );
    const publicationAuthors = normalizeText(
        publicationItem.research_meta?.author,
    );

    const summary =
        publicationSummary ||
        (publicationVenue
            ? `${publicationVenue} publication update from MMAI Lab.`
            : "Publication update from MMAI Lab.");

    return {
        id: `publication-${publicationId}`,
        type: PAPER_ACCEPTED_TYPE,
        title: publicationTitle,
        summary,
        date: publicationDate,
        year: toYear(publicationDate),
        related_person: publicationAuthors,
        venue: publicationVenue,
        external_url: "",
        internal_slug: normalizeSlug(`publication-${publicationId}`),
        is_external: false,
        featured: false,
        publication_id: publicationId,
        publication_title: publicationTitle,
        publication_query: publicationTitle,
        generated_from: AUTO_PUBLICATION_SOURCE,
    };
};

const COUNT_WORDS = [
    "",
    "A",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
];

const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/;

const stripAcronym = (value) =>
    normalizeText(value)
        .replace(/\s*\([^()]*\)\s*$/, "")
        .trim();

// Journals are spelled out in full and carry no year, so they must be told
// apart from conferences. A parenthesised acronym is not a reliable signal
// (both "Medical Image Analysis (MedIA)" and TPAMI are journals), so list the
// venues the lab publishes in and fall back to journal-style naming cues.
const JOURNAL_VENUES = new Set([
    "applied energy",
    "medical image analysis",
    "biomedical signal processing and control",
    "expert systems with applications",
    "computer methods and programs in biomedicine",
    "computers in biology and medicine",
    "neural networks",
]);

const JOURNAL_NAME_PATTERN =
    /\b(?:journal|transactions|letters|reports|annals|bulletin)\b/i;

const isJournalVenue = (raw) =>
    JOURNAL_VENUES.has(stripAcronym(raw).toLowerCase()) ||
    JOURNAL_NAME_PATTERN.test(raw);

// Conference headlines use the short form ("CVPR 2025"): prefer a trailing
// parenthesised acronym and append the publication year unless the venue
// already carries one. Journals keep their full name and no year.
const formatVenueLabel = (venue, date) => {
    const raw = normalizeText(venue);
    if (!raw) {
        return "";
    }

    if (isJournalVenue(raw)) {
        return stripAcronym(raw);
    }

    const acronymMatch = raw.match(/\(([^()]+)\)\s*$/);
    const label = acronymMatch ? acronymMatch[1].trim() : raw;

    if (YEAR_PATTERN.test(label)) {
        return label;
    }

    const year = toYear(date);
    return year ? `${label} ${year}` : label;
};

const formatPaperAcceptedTitle = (count, venue, date) => {
    const countWord = COUNT_WORDS[count] ?? String(count);
    const noun = count === 1 ? "paper" : "papers";
    const verb = count === 1 ? "has" : "have";
    return `${countWord} ${noun} ${verb} been accepted at ${formatVenueLabel(venue, date)}`;
};

const splitAuthors = (value) =>
    normalizeText(value)
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

// Presents accepted papers as "A paper has been accepted at <venue>" (or
// "Three papers have been accepted at <venue>" when a venue accepted several
// on the same date), moving the paper titles into the summary and keeping the
// authors on the trailing line.
const formatPaperAcceptedItems = (items) => {
    const groups = new Map();
    const result = [];

    items.forEach((item) => {
        if (
            item.type !== PAPER_ACCEPTED_TYPE ||
            item.generated_from !== AUTO_PUBLICATION_SOURCE ||
            !normalizeText(item.venue)
        ) {
            // Manual entries keep their authored copy; only retitle the ones
            // that carry a venue so the wording stays consistent.
            if (
                item.type === PAPER_ACCEPTED_TYPE &&
                normalizeText(item.venue)
            ) {
                result.push({
                    ...item,
                    title: formatPaperAcceptedTitle(1, item.venue, item.date),
                });
                return;
            }
            result.push(item);
            return;
        }

        const key = `${item.date}||${item.venue}`;
        if (!groups.has(key)) {
            const bucket = { key, members: [], index: result.length };
            groups.set(key, bucket);
            result.push(bucket);
        }
        groups.get(key).members.push(item);
    });

    return result.map((entry) => {
        if (!entry || !Array.isArray(entry.members)) {
            return entry;
        }

        const members = entry.members;
        const first = members[0];

        if (members.length === 1) {
            return {
                ...first,
                title: formatPaperAcceptedTitle(1, first.venue, first.date),
                summary: first.publication_title || first.title,
            };
        }

        const titles = members
            .map((member) => member.publication_title || member.title)
            .filter(Boolean);
        const authors = [];
        members.forEach((member) => {
            splitAuthors(member.related_person).forEach((name) => {
                if (!authors.includes(name)) {
                    authors.push(name);
                }
            });
        });

        return {
            ...first,
            id: `publication-group-${normalizeSlug(`${first.venue}-${first.date}`)}`,
            title: formatPaperAcceptedTitle(
                members.length,
                first.venue,
                first.date,
            ),
            summary: titles.join("\n"),
            related_person: authors.join(", "),
            internal_slug: normalizeSlug(
                `publication-group-${first.venue}-${first.date}`,
            ),
            publication_id: "",
            publication_title: "",
            publication_query: first.venue,
            grouped_publication_ids: members.map((member) =>
                normalizeText(member.publication_id),
            ),
        };
    });
};

const mergePublicationNewsItems = (manualItems, publicationItems) => {
    const mergedItems = [...manualItems];
    const seenIds = new Set(manualItems.map((item) => item.id));
    const manualPublicationIds = new Set(
        manualItems
            .map((item) => normalizeText(item.publication_id))
            .filter(Boolean),
    );
    const manualPaperKeys = new Set(
        manualItems
            .filter((item) => item.type === PAPER_ACCEPTED_TYPE)
            .map((item) =>
                normalizePaperKey(
                    item.date,
                    item.publication_title || item.title,
                ),
            )
            .filter(Boolean),
    );

    publicationItems
        .filter((item) => normalizeText(item.status) === "published")
        .forEach((publicationItem) => {
            const autoNews = createAutoPublicationNewsItem(publicationItem);
            const paperKey = normalizePaperKey(
                autoNews.date,
                autoNews.publication_title || autoNews.title,
            );

            if (seenIds.has(autoNews.id)) {
                return;
            }
            if (
                autoNews.publication_id &&
                manualPublicationIds.has(autoNews.publication_id)
            ) {
                return;
            }
            if (manualPaperKeys.has(paperKey)) {
                return;
            }

            seenIds.add(autoNews.id);
            mergedItems.push(autoNews);
        });

    return mergedItems;
};

export const syncNewsContent = async ({
    validateOnly = false,
    publicationItems = null,
} = {}) => {
    const markdownFiles = (await listMarkdownFiles(NEWS_CONTENT_DIR)).filter(
        (filePath) => !path.basename(filePath).startsWith("_"),
    );

    if (markdownFiles.length === 0) {
        throw new Error(
            `[news] No markdown files found in ${relativeFromRoot(NEWS_CONTENT_DIR)}. Add content before syncing.`,
        );
    }

    const items = [];
    const seenIds = new Set();

    for (const filePath of markdownFiles) {
        const item = await parseNewsFile(filePath);
        if (seenIds.has(item.id)) {
            throw new Error(
                `[news] Duplicate id "${item.id}" in ${relativeFromRoot(filePath)}`,
            );
        }
        seenIds.add(item.id);
        items.push(item);
    }

    const resolvedPublicationItems = Array.isArray(publicationItems)
        ? publicationItems
        : await syncPublicationContent({ validateOnly: true });

    const mergedItems = formatPaperAcceptedItems(
        mergePublicationNewsItems(items, resolvedPublicationItems).sort(
            (a, b) => {
                if (a.date === b.date) {
                    return a.id.localeCompare(b.id);
                }
                return b.date.localeCompare(a.date);
            },
        ),
    );

    if (validateOnly) {
        console.log(`[news] validated ${mergedItems.length} entries`);
        return mergedItems;
    }

    await writeJsonFile(NEWS_GENERATED_FILE, {
        meta: {
            schema_version: "4.0",
            generated_at: getNowIso(),
            default_sort: "date_desc",
            source: "content/news + publications(published)",
            type_labels: TYPE_LABELS,
        },
        items: mergedItems,
    });

    console.log(
        `[news] synced ${mergedItems.length} entries -> ${relativeFromRoot(NEWS_GENERATED_FILE)}`,
    );

    return mergedItems;
};

if (import.meta.url === `file://${process.argv[1]}`) {
    const validateOnly = process.argv.includes("--validate-only");
    syncNewsContent({ validateOnly }).catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
}
