import PUBLICATION_DATA from "../generated/publications.generated.json";

const normalizeText = (value) =>
    typeof value === "string" ? value.trim() : "";
const normalizeStringList = (value) => {
    if (!Array.isArray(value)) {
        if (typeof value !== "string") {
            return [];
        }

        return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return value.map((item) => normalizeText(item)).filter(Boolean);
};

// Items keep the generated order, which is the row order of the publication
// sheet: moving a row there moves the paper on the site.
export const getAllPublications = () =>
    (PUBLICATION_DATA?.items ?? [])
        .map((item, index) => {
            const id = normalizeText(item?.id) || `publication-${index + 1}`;
            const category =
                normalizeText(item?.category) ||
                "computer_vision_and_learning_algorithms";
            const title = normalizeText(item?.title) || "Untitled publication";
            const researchMeta = item?.research_meta ?? {};
            const publishedDate =
                normalizeText(researchMeta?.published_date) || "1970-01-01";

            return {
                ...item,
                id,
                key: normalizeText(item?.key) || id,
                category,
                title,
                research_meta: {
                    author: normalizeText(researchMeta?.author),
                    published_place: normalizeText(
                        researchMeta?.published_place,
                    ),
                    published_date: publishedDate,
                    keywords: normalizeStringList(researchMeta?.keywords),
                    pdf_link: normalizeText(researchMeta?.pdf_link),
                    arxiv_link: normalizeText(researchMeta?.arxiv_link),
                    github_link: normalizeText(
                        researchMeta?.github_link ||
                            researchMeta?.source_code_link,
                    ),
                    project_link: normalizeText(
                        researchMeta?.project_link || researchMeta?.paper_link,
                    ),
                    source_code_link: normalizeText(
                        researchMeta?.source_code_link ||
                            researchMeta?.github_link,
                    ),
                    paper_link: normalizeText(
                        researchMeta?.paper_link || researchMeta?.project_link,
                    ),
                },
            };
        });

export const getPublicationCategories = () => {
    const categories = Array.from(
        new Set(getAllPublications().map((item) => item.category)),
    );
    return ["all", ...categories];
};

export const getLatestPublications = (limit = 3) =>
    getAllPublications().slice(0, limit);

// Journals rarely carry a parenthesised acronym in the metadata, so map the
// ones the lab publishes in to the short forms used on their own sites.
const VENUE_TAG_ABBREVIATIONS = {
    "applied energy": "Applied Energy",
    "biomedical signal processing and control": "BSPC",
    "computer methods and programs in biomedicine": "CMPB",
    "computers in biology and medicine": "CIBM",
    "expert systems with applications": "ESWA",
    "international journal of surgery": "IJS",
    "journal of digital imaging": "JDI",
    "neural networks": "Neural Networks",
    "pattern recognition letters": "PRL",
    "scientific reports": "Sci Rep",
};

// Cards show the venue as a compact tag next to the research area, so prefer a
// trailing parenthesised acronym ("Conference on Robot Learning (CoRL)" ->
// "CoRL"), then a known journal short form, then the name as written.
export const getVenueTagLabel = (venue) => {
    const raw = normalizeText(venue);
    if (!raw) {
        return "";
    }

    const mapped = VENUE_TAG_ABBREVIATIONS[raw.toLowerCase()];
    if (mapped) {
        return mapped;
    }

    const acronym = raw.match(/\(([^()]+)\)\s*$/);
    return acronym ? acronym[1].trim() : raw;
};
