import path from "node:path";
import {
    PUBLICATIONS_GENERATED_FILE,
    PUBLICATIONS_SHEET_SNAPSHOT_FILE,
    getNowIso,
    normalizeHttpUrl,
    readJsonFile,
    relativeFromRoot,
    writeJsonFile,
} from "./lib.mjs";
import {
    PUBLICATION_STATUSES,
    publicationItemToSheetValues,
    splitSheetList,
    validatePublicationSheetRow,
} from "../../src/utils/publicationSheetRules.js";

const RESEARCH_AREAS_FILE = path.resolve(
    "src/assets/dataset/research_areas.json",
);

const normalizeText = (value) => String(value ?? "").trim();

export const getPublicationCategories = async () => {
    const researchCatalog = await readJsonFile(RESEARCH_AREAS_FILE, {});
    const categories = new Set(researchCatalog.meta?.area_order ?? []);
    if (categories.size === 0) {
        throw new Error(
            `[publications] No research area categories found in ${relativeFromRoot(RESEARCH_AREAS_FILE)}.`,
        );
    }
    return categories;
};

// Builds the generated publication shape from one sheet row ({ column:
// text }). Throws with every problem in the row, phrased for operators.
export const buildPublicationItem = (record, id, publicationCategories) => {
    const errors = validatePublicationSheetRow(
        { ...record, id },
        { categories: publicationCategories },
    );
    if (!id) {
        errors.push({ field: "id", message: "ID가 없습니다." });
    }
    if (errors.length > 0) {
        throw new Error(
            errors
                .map(({ field, message }) => `"${field}" ${message}`)
                .join(" "),
        );
    }

    const projectUrl = normalizeHttpUrl(record.project_url);
    const githubUrl = normalizeHttpUrl(record.github_url);

    return {
        id,
        key: id,
        category: normalizeText(record.category),
        status: normalizeText(record.status) || "published",
        title: normalizeText(record.title),
        summary: normalizeText(record.summary),
        featured: normalizeText(record.featured).toLowerCase() === "true",
        research_meta: {
            author: normalizeText(record.authors),
            published_place: normalizeText(record.venue),
            published_date: normalizeText(record.date),
            accepted_date: normalizeText(record.accepted_date),
            keywords: splitSheetList(record.keywords),
            pdf_link: normalizeHttpUrl(record.pdf_url),
            arxiv_link: normalizeHttpUrl(record.arxiv_url),
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

export const sortPublicationItems = (items) =>
    items.sort((a, b) => {
        const dateCompare = b.research_meta.published_date.localeCompare(
            a.research_meta.published_date,
        );
        return dateCompare || a.id.localeCompare(b.id);
    });

// The snapshot is written by the sheet sync, but it is a committed file that
// can also be edited by hand, so every item is validated again here.
export const syncPublicationContent = async ({ validateOnly = false } = {}) => {
    const publicationCategories = await getPublicationCategories();
    const snapshot = await readJsonFile(PUBLICATIONS_SHEET_SNAPSHOT_FILE, null);
    const snapshotItems = Array.isArray(snapshot?.items) ? snapshot.items : [];

    if (snapshotItems.length === 0) {
        throw new Error(
            `[publications] ${relativeFromRoot(PUBLICATIONS_SHEET_SNAPSHOT_FILE)} has no items. Run "npm run publications:pull".`,
        );
    }

    const items = [];
    const seenIds = new Set();
    const errors = [];

    snapshotItems.forEach((snapshotItem, index) => {
        const id = normalizeText(snapshotItem?.id);
        try {
            const item = buildPublicationItem(
                publicationItemToSheetValues(snapshotItem),
                id,
                publicationCategories,
            );
            if (seenIds.has(id)) {
                throw new Error(`duplicate id "${id}"`);
            }
            seenIds.add(id);
            items.push(item);
        } catch (error) {
            errors.push(
                `[publications] snapshot item ${index + 1} (${id || "no id"}): ${error.message}`,
            );
        }
    });

    if (errors.length > 0) {
        throw new Error(errors.join("\n"));
    }

    sortPublicationItems(items);

    if (validateOnly) {
        console.log(`[publications] validated ${items.length} entries`);
        return items;
    }

    const categories = Array.from(new Set(items.map((item) => item.category)));

    await writeJsonFile(PUBLICATIONS_GENERATED_FILE, {
        meta: {
            schema_version: "1.1",
            generated_at: getNowIso(),
            source: relativeFromRoot(PUBLICATIONS_SHEET_SNAPSHOT_FILE),
            categories,
            statuses: PUBLICATION_STATUSES,
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
