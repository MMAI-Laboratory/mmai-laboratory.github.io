import "./Publication.css";
import PublicationCard from "./Publication.Card";
import { useEffect, useMemo, useState } from "react";
import {
    aggregatePublications,
    getPublicationCategories,
} from "./home/homeData";
import { useLocation } from "react-router-dom";
import { resolveResearchAreaKey } from "../../utils/researchData";

const areaCategory = getPublicationCategories();
const publications = aggregatePublications();
const SEARCH_SCOPES = [
    { key: "title", label: "Title" },
    { key: "title-authors", label: "Title + Authors" },
    { key: "title-authors-venue", label: "Title + Authors + Venue" },
];

function Publication() {
    const location = useLocation();
    const [selectedArea, setSelectedArea] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchScope, setSearchScope] = useState("title-authors-venue");

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const queryFromParams = params.get("q")?.trim() ?? "";
        const scopeFromParams = params.get("scope")?.trim() ?? "";
        const areaFromParams = params.get("area")?.trim() ?? "";
        const normalizedAreaFromParams =
            areaFromParams === "all"
                ? "all"
                : resolveResearchAreaKey(areaFromParams);

        const hasValidScope = SEARCH_SCOPES.some(
            (item) => item.key === scopeFromParams,
        );
        const hasValidArea = areaCategory.includes(normalizedAreaFromParams);

        setSearchQuery(queryFromParams);
        setSearchScope(hasValidScope ? scopeFromParams : "title-authors-venue");
        setSelectedArea(hasValidArea ? normalizedAreaFromParams : "all");
    }, [location.search]);

    const filteredPublications = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return publications.filter((publicationItem) => {
            const areaMatch =
                selectedArea === "all" ||
                selectedArea === publicationItem.category;

            if (!areaMatch) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            const searchParts = [publicationItem.title, publicationItem.id];

            if (
                searchScope === "title-authors" ||
                searchScope === "title-authors-venue"
            ) {
                searchParts.push(publicationItem.research_meta.author);
            }

            if (searchScope === "title-authors-venue") {
                searchParts.push(publicationItem.research_meta.published_place);
                searchParts.push(
                    ...(publicationItem.research_meta.keywords ?? []),
                );
            }

            const searchTarget = searchParts.join(" ").toLowerCase();

            return searchTarget.includes(normalizedQuery);
        });
    }, [searchQuery, selectedArea, searchScope]);

    return (
        <div data-reveal data-reveal-load-delay="60" className="publication">
            {/* Filter and search — temporarily hidden.
            <div
                data-reveal
                className="publication__controls page-panel page-panel--compact page-panel--section-start page-controls">
                <div className="publication__controls-intro page-controls__intro">
                    <h2 id="publication-controls-title">Filter and search</h2>
                </div>
                <div className="publication__controls-grid page-controls__grid">
                    <section className="publication__controls-group page-controls__group">
                        <div className="publication__controls-head">
                            <p className="publication__controls-label page-controls__label">
                                Filter by research area
                            </p>
                        </div>
                        <div
                            className="publication__filter page-controls__actions"
                            role="group"
                            aria-label="Filter publications by area">
                            {areaCategory.map((area, i) => (
                                <PublicationButton
                                    key={area + i}
                                    areaKey={area}
                                    isSelected={selectedArea === area}
                                    onSelect={() => handleSelectedArea(area)}>
                                    {RESEARCH_CATEGORY_LABELS[area] ||
                                        area.charAt(0).toUpperCase() +
                                            area.slice(1)}
                                </PublicationButton>
                            ))}
                        </div>
                    </section>

                    <section className="publication__controls-group page-controls__group">
                        <div className="publication__controls-head">
                            <label
                                className="publication__search-label page-controls__label"
                                htmlFor="publication-search">
                                Search publications
                            </label>
                        </div>
                        <div className="publication__search-layout">
                            <div className="publication__search-input-wrap">
                                <input
                                    id="publication-search"
                                    type="search"
                                    className="publication__search-input"
                                    placeholder={
                                        SEARCH_PLACEHOLDER_BY_SCOPE[
                                            searchScope
                                        ] || "Search publications"
                                    }
                                    value={searchQuery}
                                    onChange={(event) =>
                                        setSearchQuery(event.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            */}

            <section
                data-reveal
                className="publication__archive page-panel"
                aria-labelledby="publication-archive-title">
                <div className="publication__section-head">
                    <div>
                        <h2 id="publication-archive-title">
                            Publication Archive
                        </h2>
                        <p>
                            {filteredPublications.length} result
                            {filteredPublications.length === 1 ? "" : "s"} in
                            the current view
                        </p>
                    </div>
                </div>
                <div className="publication__list">
                    {filteredPublications.map((tpub, index) => (
                        <PublicationCard
                            key={`${tpub.key}-${index}`}
                            publicationId={tpub.id}
                            category={tpub.category}
                            meta={tpub.research_meta}
                            title={tpub.title}
                            revealDelay={`${Math.min(index, 5) * 60}ms`}
                            revealLoadDelay={`${120 + Math.min(index, 5) * 60}`}
                        />
                    ))}
                    {filteredPublications.length === 0 && (
                        <p className="publication__empty">
                            No publications match your selected category and
                            search scope.
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}

export default Publication;
