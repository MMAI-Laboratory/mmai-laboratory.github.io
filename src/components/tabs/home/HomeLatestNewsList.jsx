import { Link } from "react-router-dom";
import {
    formatNewsDate,
    getLatestNews,
    getNewsTypeMeta,
    isValidHttpUrl,
} from "./homeData";

const isNonEmpty = (value) =>
    typeof value === "string" && value.trim().length > 0;

const PAPER_ACCEPTED_TITLE_PATTERN =
    /^(?:paper\s+accepted\b|(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+papers?\s+(?:has|have)\s+been\s+accepted\b)/i;

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

export default function HomeLatestNewsList() {
    const newsItems = getLatestNews(4);

    return (
        <section
            data-reveal
            data-reveal-load-delay="180"
            className="home-block home-news"
            aria-labelledby="home-news-title">
            <div className="home-block__head">
                <div>
                    <h2 id="home-news-title">Latest News</h2>
                    <p>
                        Latest updates on our research, members, and
                        achievements.
                    </p>
                </div>
            </div>

            <div className="home-news__list">
                {newsItems.map((item, index) => {
                    const isPaperAccepted = item.type === "paper_accepted";
                    const publicationQuery = getPublicationSearchQuery(item);
                    const publicationTarget = publicationQuery
                        ? `/publication?q=${encodeURIComponent(publicationQuery)}&scope=title-authors-venue`
                        : "/publication";
                    const isExternal =
                        !isPaperAccepted &&
                        item.is_external &&
                        isValidHttpUrl(item.external_url);
                    const internalTarget = item.internal_slug
                        ? `/news#${item.internal_slug}`
                        : "/news";
                    const targetPath = isPaperAccepted
                        ? publicationTarget
                        : internalTarget;
                    const revealDelay = `${index * 60}ms`;
                    const revealLoadDelay = `${120 + index * 60}`;
                    const typeLabel = getNewsTypeMeta(item.type).label;
                    const statusLabel = isPaperAccepted
                        ? "Publication"
                        : isExternal
                          ? "External"
                          : "Lab update";
                    const headline = item.title;
                    const summary = isNonEmpty(item.summary)
                        ? item.summary.trim()
                        : "";
                    const details = isNonEmpty(item.related_person)
                        ? item.related_person.trim()
                        : "";
                    const commonProps = {
                        "data-reveal": true,
                        "data-reveal-load-delay": revealLoadDelay,
                        style: { "--reveal-delay": revealDelay },
                        className:
                            "home-news__row home-news__row--link interactive-row is-clickable",
                    };

                    const rowContent = (
                        <>
                            <p className="home-news__date">
                                {formatNewsDate(item.date)}
                            </p>
                            <div className="home-news__body">
                                <div className="home-news__badges">
                                    <p className="home-news__badge home-news__badge--type">
                                        {typeLabel}
                                    </p>
                                    <p
                                        className={`home-news__badge home-news__badge--status ${isExternal ? "is-external" : ""}`}>
                                        {statusLabel}
                                    </p>
                                </div>
                                <p className="home-news__headline interactive-row__title animated-underline">
                                    {headline}
                                </p>
                                {summary ? (
                                    <p className="home-news__meta">{summary}</p>
                                ) : null}
                                {details ? (
                                    <p className="home-news__meta">{details}</p>
                                ) : null}
                            </div>
                        </>
                    );

                    if (isExternal) {
                        return (
                            <a
                                key={item.id}
                                {...commonProps}
                                href={item.external_url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`${headline} (opens external link)`}>
                                {rowContent}
                            </a>
                        );
                    }

                    return (
                        <Link
                            key={item.id}
                            {...commonProps}
                            to={targetPath}
                            aria-label={`${headline} (view related content)`}>
                            {rowContent}
                        </Link>
                    );
                })}
            </div>

            <div className="home-block__section-footer">
                <Link
                    to="/news"
                    state={{ scroll: { mode: "top" } }}
                    className="home-block__section-action btn btn--tertiary animated-underline">
                    View all news
                    <span className="home-block__section-action-icon">→</span>
                </Link>
            </div>
        </section>
    );
}
