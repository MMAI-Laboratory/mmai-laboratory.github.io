import { Link } from "react-router-dom";
import { getLatestPublications } from "./homeData";
import PublicationLinkIcons from "../Publication.LinkIcons";
import PublicationFigure from "../Publication.Figure";
import { RESEARCH_CATEGORY_LABELS } from "../../../utils/researchData";
import { getVenueTagLabel } from "../../../utils/publicationData";

const splitPublicationVenue = (item) => ({
  venue: item.research_meta.published_place?.trim() ?? "",
  date: item.research_meta.published_date?.trim() ?? "",
});

export default function HomeSelectedPublications() {
  const previewPublications = getLatestPublications(4);

  if (!previewPublications.length) {
    return null;
  }

  return (
    <section
      data-reveal
      data-reveal-load-delay="140"
      className="home-block home-selected-publications"
      aria-labelledby="home-selected-publications-title"
    >
      <div className="home-block__head">
        <div>
          <h2 id="home-selected-publications-title">Publications</h2>
          <p>Browse our latest publications and research highlights.</p>
        </div>
      </div>

      <div className="home-pubs__list">
        {previewPublications.map((item, index) => {
          const revealDelay = `${index * 60}ms`;
          const revealLoadDelay = `${200 + index * 60}`;
          const queryTarget = `/publication?q=${encodeURIComponent(item.title)}&scope=title-authors-venue`;
          const categoryLabel =
            RESEARCH_CATEGORY_LABELS[item.category] || item.category;
          const venueTag = getVenueTagLabel(item.research_meta.published_place);
          const { venue, date } = splitPublicationVenue(item);
          return (
            <article
              key={item.key}
              data-reveal
              data-reveal-load-delay={revealLoadDelay}
              style={{ "--reveal-delay": revealDelay }}
              className="home-pubs__row interactive-row"
            >
              <PublicationFigure
                publicationId={item.id}
                className="home-pubs__row-media"
                sizes="(max-width: 768px) 13rem, 11.2rem"
              />
              <div className="home-pubs__meta">
                <div className="home-pubs__badges">
                  <p
                    className={`home-pubs__badge home-pubs__badge--${item.category}`}
                  >
                    {categoryLabel}
                  </p>
                  {venueTag ? (
                    <p className="home-pubs__badge home-pubs__badge--venue">
                      {venueTag}
                    </p>
                  ) : null}
                </div>
                <p className="home-pubs__title interactive-row__title">
                  <Link
                    to={queryTarget}
                    className="home-pubs__title-link animated-underline"
                  >
                    {item.title}
                  </Link>
                </p>
                {item.research_meta.author ? (
                  <p className="home-pubs__author">
                    {item.research_meta.author}
                  </p>
                ) : null}
                {venue || date ? (
                  <p>
                    {venue ? (
                      <span className="home-pubs__venue">{venue}</span>
                    ) : null}
                    {venue && date ? " · " : null}
                    {date ? <span>{date}</span> : null}
                  </p>
                ) : null}
              </div>
              <div className="home-pubs__row-links">
                <PublicationLinkIcons meta={item.research_meta} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="home-block__section-footer">
        <Link
          to="/publication"
          state={{ scroll: { mode: "top" } }}
          className="home-block__section-action btn btn--tertiary animated-underline"
        >
          View all publications
          <span className="home-block__section-action-icon">→</span>
        </Link>
      </div>
    </section>
  );
}
