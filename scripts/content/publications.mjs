import path from "node:path";
import { promises as fs } from "node:fs";
import {
    PUBLICATIONS_CONTENT_DIR,
    PUBLICATIONS_GENERATED_FILE,
    getNowIso,
    isIsoDate,
    listMarkdownFiles,
    normalizeHttpUrl,
    normalizeSlug,
    parseMarkdownFrontmatter,
    readJsonFile,
    relativeFromRoot,
    writeJsonFile,
} from "./lib.mjs";

const RESEARCH_AREAS_FILE = path.resolve(
    "src/assets/dataset/research_areas.json",
);
const PUBLICATION_STATUSES = new Set(["published", "working", "project"]);

const normalizeText = (value) => String(value ?? "").trim();
const normalizeStringList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeText(item)).filter(Boolean);
    }

    const text = normalizeText(value);
    if (!text) {
        return [];
    }

    return text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

const requiredError = (filePath, fieldName, message = "is required") =>
    `[publications] ${relativeFromRoot(filePath)}: "${fieldName}" ${message}`;

const parsePublicationFile = async (filePath, publicationCategories) => {
    const raw = await fs.readFile(filePath, "utf8");
    const { data, body } = parseMarkdownFrontmatter(raw, filePath);

    const id =
        normalizeText(data.id) || normalizeSlug(path.basename(filePath, ".md"));
    const title = normalizeText(data.title);
    const category = normalizeText(data.category);
    const status = normalizeText(data.status || "published");
    const date = normalizeText(data.date);
    const acceptedDate = normalizeText(data.accepted_date);
    const authors = normalizeText(data.authors);
    const venue = normalizeText(data.venue);
    const projectUrl = normalizeHttpUrl(
        data.project_url || data.paper_url || data.external_url,
    );
    const pdfUrl = normalizeHttpUrl(data.pdf_url);
    const arxivUrl = normalizeHttpUrl(data.arxiv_url);
    const githubUrl = normalizeHttpUrl(data.github_url || data.source_code_url);
    const keywords = normalizeStringList(data.keywords);
    const featured = data.featured === true;
    const summary =
        normalizeText(data.summary) || body.split("\n")[0]?.trim() || "";

    if (!id) {
        throw new Error(requiredError(filePath, "id"));
    }
    if (!title) {
        throw new Error(requiredError(filePath, "title"));
    }
    if (!category) {
        throw new Error(requiredError(filePath, "category"));
    }
    if (!publicationCategories.has(category)) {
        throw new Error(
            `[publications] ${relativeFromRoot(filePath)}: unsupported category "${category}". Allowed: ${Array.from(publicationCategories).join(", ")}`,
        );
    }
    if (!PUBLICATION_STATUSES.has(status)) {
        throw new Error(
            `[publications] ${relativeFromRoot(filePath)}: unsupported status "${status}". Allowed: ${Array.from(PUBLICATION_STATUSES).join(", ")}`,
        );
    }
    if (!date) {
        throw new Error(requiredError(filePath, "date"));
    }
    if (!isIsoDate(date)) {
        throw new Error(
            `[publications] ${relativeFromRoot(filePath)}: "date" must be YYYY-MM-DD (received "${date}")`,
        );
    }
    if (acceptedDate && !isIsoDate(acceptedDate)) {
        throw new Error(
            `[publications] ${relativeFromRoot(filePath)}: "accepted_date" must be YYYY-MM-DD (received "${acceptedDate}")`,
        );
    }
    if (!authors) {
        throw new Error(requiredError(filePath, "authors"));
    }
    if (!venue) {
        throw new Error(requiredError(filePath, "venue"));
    }

    return {
        id,
        key: id,
        category,
        status,
        title,
        summary,
        featured,
        research_meta: {
            author: authors,
            published_place: venue,
            published_date: date,
            accepted_date: acceptedDate,
            keywords,
            pdf_link: pdfUrl,
            arxiv_link: arxivUrl,
            github_link: githubUrl,
            project_link: projectUrl,
            source_code_link: githubUrl,
            paper_link: projectUrl,
        },
        content: {
            problem: "",
            solve: "",
            expermental_result: "",
        },
    };
};

export const syncPublicationContent = async ({ validateOnly = false } = {}) => {
    const researchCatalog = await readJsonFile(RESEARCH_AREAS_FILE, {});
    const publicationCategories = new Set(
        researchCatalog.meta?.area_order ?? [],
    );

    if (publicationCategories.size === 0) {
        throw new Error(
            `[publications] No research area categories found in ${relativeFromRoot(RESEARCH_AREAS_FILE)}.`,
        );
    }

    const markdownFiles = (
        await listMarkdownFiles(PUBLICATIONS_CONTENT_DIR)
    ).filter((filePath) => !path.basename(filePath).startsWith("_"));

    if (markdownFiles.length === 0) {
        throw new Error(
            `[publications] No markdown files found in ${relativeFromRoot(PUBLICATIONS_CONTENT_DIR)}. Add content before syncing.`,
        );
    }

    const items = [];
    const seenIds = new Set();

    for (const filePath of markdownFiles) {
        const item = await parsePublicationFile(
            filePath,
            publicationCategories,
        );
        if (seenIds.has(item.id)) {
            throw new Error(
                `[publications] Duplicate id "${item.id}" in ${relativeFromRoot(filePath)}`,
            );
        }
        seenIds.add(item.id);
        items.push(item);
    }

    items.sort((a, b) => {
        const dateCompare = b.research_meta.published_date.localeCompare(
            a.research_meta.published_date,
        );
        if (dateCompare !== 0) {
            return dateCompare;
        }
        return a.id.localeCompare(b.id);
    });

    if (validateOnly) {
        console.log(`[publications] validated ${items.length} entries`);
        return items;
    }

    const categories = Array.from(new Set(items.map((item) => item.category)));

    await writeJsonFile(PUBLICATIONS_GENERATED_FILE, {
        meta: {
            schema_version: "1.1",
            generated_at: getNowIso(),
            source: "content/publications",
            categories,
            statuses: Array.from(PUBLICATION_STATUSES),
        },
        items,
    });

    console.log(
        `[publications] synced ${items.length} entries -> ${relativeFromRoot(PUBLICATIONS_GENERATED_FILE)}`,
    );

    return items;
};

if (import.meta.url === `file://${process.argv[1]}`) {
    const validateOnly = process.argv.includes("--validate-only");
    syncPublicationContent({ validateOnly }).catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
}
