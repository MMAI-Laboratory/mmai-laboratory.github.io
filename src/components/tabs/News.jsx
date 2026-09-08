import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    formatNewsDate,
    getAllNewsItems,
    getNewsTypeMeta,
    getNewsTypes,
    isValidExternalUrl,
} from "../../utils/newsData";
import "./News.css";

const PAPER_ACCEPTED_TITLE_PATTERN =
    /^(?:paper\s+accepted\b|(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+papers?\s+(?:has|have)\s+been\s+accepted\b)/i;

const isNonEmpty = (value) =>
    typeof value === "string" && value.trim().length > 0;

const getPublicationSearchQuery = (item) => {
    const candidates = [
        item.publication_id,
        item.publication_title,
        item.publication_query,
    ];

    for (const candidate of candidates) {
        if (isNonEmpty(candidate)) {
            return candidate.trim();
        }
    }

    if (
        isNonEmpty(item.title) &&
        !PAPER_ACCEPTED_TITLE_PATTERN.test(item.title.trim())
    ) {
        return item.title.trim();
    }

    if (isNonEmpty(item.summary)) {
        return item.summary.trim();
    }

    if (isNonEmpty(item.venue)) {
        return item.venue.trim();
    }

    return "";
};

function News() {
    const [selectedType, setSelectedType] = useState("all");
    const allNewsItems = useMemo(() => getAllNewsItems(), []);

    const filteredNewsItems = useMemo(() => {
        if (selectedType === "all") {
            return allNewsItems;
        }

        return allNewsItems.filter((item) => item.type === selectedType);
    }, [allNewsItems, selectedType]);

    const groupedByYear = useMemo(() => {
        const groups = new Map();

        filteredNewsItems.forEach((item) => {
            const yearLabel = String(
                item.year || new Date(item.date).getFullYear(),
            );
            if (!groups.has(yearLabel)) {
                groups.set(yearLabel, []);
            }

            groups.get(yearLabel).push(item);
        });

        return Array.from(groups.entries()).map(([year, items]) => ({
            year,
            items,
        }));
    }, [filteredNewsItems]);
    const yearOptions = useMemo(
        () => groupedByYear.map((group) => group.year),
        [groupedByYear],
    );

    const typeOptions = useMemo(() => getNewsTypes(), []);

    return (
        <section data-reveal data-reveal-load-delay="60" className="news-page">
            <div data-reveal className="tab-header page-head page-head--news">
                <h1>News</h1>
                <p className="page-head__summary">
                    Archive of papers, seminars, member updates, infrastructure
                    milestones, and collaboration activities.
                </p>
            </div>

            <div
                data-reveal
                className="news-page__controls page-panel page-panel--compact page-panel--section-start page-controls">
                <div className="news-page__controls-intro page-controls__intro">
                    <h2 id="news-controls-title">Filter and browse updates</h2>
                    <p>
                        Select a type and jump year inside one control surface.
                        Timeline rows update immediately.
                    </p>
                </div>
                <div className="news-page__controls-grid page-controls__grid">
                    <section className="news-page__controls-group page-controls__group">
                        <div className="news-page__controls-head">
                            <p className="news-page__controls-label page-controls__label">
                                Type filter
                            </p>
                            <p className="news-page__controls-caption page-controls__caption">
                                Narrow the archive by update type.
                            </p>
                        </div>
                        <div
                            className="news-page__filters page-controls__actions"
                            role="group"
                            aria-label="Filter news by type">
                            {typeOptions.map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    className={`news-page__filter-btn btn btn--secondary btn--sm interactive-button ${selectedType === type ? "is-active" : ""}`}
                                    onClick={() => setSelectedType(type)}
                                    aria-pressed={selectedType === type}>
                                    {getNewsTypeMeta(type).label}
                                </button>
                            ))}
                        </div>
                    </section>
                    {yearOptions.length > 0 ? (
                        <nav
                            id="news-year-nav"
                            className="news-page__controls-group page-controls__group"
                            aria-label="Jump to news year">
                            <div className="news-page__controls-head">
                                <p className="news-page__controls-label page-controls__label">
                                    Jump to year
                                </p>
                                <p className="news-page__controls-caption page-controls__caption">
                                    Move directly to a specific year in the
                                    current filtered archive.
                                </p>
                            </div>
                            <div className="news-page__year-nav-list page-controls__actions">
                                {yearOptions.map((year) => (
                                    <a
                                        key={year}
                                        href={`#news-year-${year}`}
                                        className="news-page__year-link btn btn--secondary btn--sm interactive-button"
                                        aria-label={`Jump to ${year} news`}>
                                        {year}
                                    </a>
                                ))}
                            </div>
                        </nav>
                    ) : (
                        <section
                            className="news-page__controls-group page-controls__group"
                            aria-live="polite">
                            <div className="news-page__controls-head">
                                <p className="news-page__controls-label page-controls__label">
                                    Jump to year
                                </p>
                                <p className="news-page__controls-caption page-controls__caption">
                                    No year targets are available for this
                                    filter.
                                </p>
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <div id="news-archive-title" className="news-page__archive">
                {groupedByYear.map((group, groupIndex) => (
                    <section
                        key={group.year}
                        data-reveal
                        data-reveal-load-delay={`${80 + Math.min(groupIndex, 3) * 50}`}
                        className="news-page__year-group page-panel page-panel--compact"
                        aria-labelledby={`news-year-${group.year}`}>
                        <h2
                            id={`news-year-${group.year}`}
                            className="news-page__year-heading">
                            {group.year}
                        </h2>
                        <div className="news-page__list">
                            {group.items.map((item, index) => {
                                const isPaperAccepted =
                                    item.type === "paper_accepted";
                                const hasExternalLink =
                                    !isPaperAccepted &&
                                    item.is_external &&
                                    isValidExternalUrl(item.external_url);
                                const hasAction =
                                    isPaperAccepted || hasExternalLink;
                                const publicationQuery =
                                    getPublicationSearchQuery(item);
                                const publicationTarget = publicationQuery
                                    ? `/publication?q=${encodeURIComponent(publicationQuery)}&scope=title-authors-venue`
                                    : "/publication";
                                const newsTypeMeta = getNewsTypeMeta(item.type);
                                const statusLabel = isPaperAccepted
                                    ? "Publication"
                                    : hasExternalLink
                                      ? "External"
                                      : "Lab update";
                                const details = item.related_person || "";

                                return (
                                    <article
                                        key={item.id}
                                        id={item.internal_slug || item.id}
                                        data-reveal
                                        data-reveal-load-delay={`${120 + Math.min(index, 5) * 60}`}
                                        style={{
                                            "--reveal-delay": `${Math.min(index, 5) * 60}ms`,
                                        }}
                                        className={`news-page__item ${hasAction ? "news-page__item--with-action" : "news-page__item--plain"}`}>
                                        <p className="news-page__date">
                                            {formatNewsDate(item.date)}
                                        </p>
                                        <div className="news-page__content">
                                            <div className="news-page__badges">
                                                <p className="news-page__badge news-page__badge--type">
                                                    {newsTypeMeta.label}
                                                </p>
                                                <p
                                                    className={`news-page__badge news-page__badge--status ${hasExternalLink ? "is-external" : ""}`}>
                                                    {statusLabel}
                                                </p>
                                            </div>
                                            <h3 className="news-page__title">
                                                {item.title}
                                            </h3>
                                            <p className="news-page__summary">
                                                {item.summary}
                                            </p>
                                            {details ? (
                                                <p className="news-page__details">
                                                    {details}
                                                </p>
                                            ) : null}
                                        </div>
                                        {hasAction ? (
                                            <div className="news-page__action">
                                                {isPaperAccepted ? (
                                                    <Link
                                                        to={publicationTarget}
                                                        className="news-page__action-link btn btn--tertiary animated-underline">
                                                        <span>
                                                            Publications
                                                        </span>
                                                        <span className="news-page__action-arrow">
                                                            →
                                                        </span>
                                                    </Link>
                                                ) : (
                                                    <a
                                                        href={item.external_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="news-page__action-link btn btn--tertiary animated-underline">
                                                        <span>Open</span>
                                                        <span className="news-page__action-arrow">
                                                            ↗
                                                        </span>
                                                    </a>
                                                )}
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {groupedByYear.length === 0 ? (
                    <p className="news-page__empty">
                        No news items in this category yet.
                    </p>
                ) : null}
            </div>
        </section>
    );
}

export default News;
