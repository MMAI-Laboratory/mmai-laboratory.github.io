import "./People.css";
import PeopleCard from "./People.Card";
import PeopleProfessorCard from "./People.ProfessorCard";
import { getPeopleSections } from "../../utils/peopleData";
import { getResearchResources } from "../../utils/researchData";
import "./Resources.css";

const HERO_SECTION_KEYS = new Set(["professor", "administrative_staff"]);

function PeopleSectionHeader({ section }) {
    return (
        <div className="people__degree-header">
            <div className="people__degree-title-wrap">
                <h2 id={`people-section-${section.key}`}>{section.title}</h2>
            </div>
            <span className="people__degree-count">
                {section.people.length}
            </span>
        </div>
    );
}

function PeopleSectionBody({ section, showResearch, showCurrentPosition }) {
    if (section.people.length === 0) {
        return (
            <div className="people__empty">
                <p>No entries currently listed in this section.</p>
            </div>
        );
    }

    return (
        <div
            className={`people__card-grid ${section.key === "professor" ? "people__card-grid--professor" : ""}`}>
            {section.people.map((person, i) =>
                section.key === "professor" ? (
                    <PeopleProfessorCard
                        key={`${section.key}-${person.id}`}
                        profile={person.image}
                        name={person.name}
                        email={person.email}
                        position={person.position}
                        homepage={person.homepage}
                        links={person.links}
                        profileDetails={person.profile_details}
                        revealDelay={`${Math.min(i, 5) * 60}ms`}
                        revealLoadDelay={`${100 + Math.min(i, 5) * 60}`}
                    />
                ) : (
                    <PeopleCard
                        key={`${section.key}-${person.id}`}
                        profile={person.image}
                        name={person.name}
                        email={person.email}
                        position={person.position}
                        homepage={person.homepage}
                        links={person.links}
                        revealDelay={`${Math.min(i, 5) * 60}ms`}
                        revealLoadDelay={`${100 + Math.min(i, 5) * 60}`}
                        research_interest={
                            showResearch.has(section.key)
                                ? person.research_interests
                                : null
                        }
                        current_position={
                            showCurrentPosition.has(section.key)
                                ? person.current_position
                                : null
                        }
                        hideInfoIfEmpty={section.key === "administrative_staff"}
                        noteText={
                            section.key === "administrative_staff"
                                ? person.note
                                : ""
                        }
                        hidePublicationLink={
                            section.key === "administrative_staff"
                        }
                    />
                ),
            )}
        </div>
    );
}

function People() {
    const sections = getPeopleSections();
    const showResearch = new Set(["phd", "master", "intern"]);
    const showCurrentPosition = new Set(["alumni"]);

    const heroSections = sections.filter((section) =>
        HERO_SECTION_KEYS.has(section.key),
    );
    const restSections = sections.filter(
        (section) => !HERO_SECTION_KEYS.has(section.key),
    );
    const nonHumanMembers = getResearchResources();

    return (
        <div data-reveal data-reveal-load-delay="60" className="people">
            <div data-reveal className="tab-header page-head page-head--people">
                <h1>Members</h1>
                <p className="page-head__summary">
                    The people and the research infrastructure behind ongoing
                    MMAI Lab projects.
                </p>
            </div>

            <h2 className="people__group-title" id="human-members">
                Human Members
            </h2>

            {heroSections.length > 0 ? (
                <div data-reveal className="people__hero-row">
                    {heroSections.map((section) => (
                        <section
                            key={section.key}
                            className="people__section people__hero-section page-panel page-panel--compact">
                            <PeopleSectionHeader section={section} />
                            <PeopleSectionBody
                                section={section}
                                showResearch={showResearch}
                                showCurrentPosition={showCurrentPosition}
                            />
                        </section>
                    ))}
                </div>
            ) : null}

            {restSections.map((section) => (
                <section
                    data-reveal
                    key={section.key}
                    className="people__section page-panel page-panel--compact">
                    <PeopleSectionHeader section={section} />
                    <PeopleSectionBody
                        section={section}
                        showResearch={showResearch}
                        showCurrentPosition={showCurrentPosition}
                    />
                </section>
            ))}

            {nonHumanMembers.length ? (
                <>
                    <h2 className="people__group-title" id="non-human-members">
                        Non-Human Members
                    </h2>
                    <section
                        data-reveal
                        className="people__section page-panel page-panel--compact"
                        aria-labelledby="non-human-members">
                        <div className="resources__grid people__non-human-grid">
                            {nonHumanMembers.map((resource, index) => (
                                <article
                                    key={resource.id}
                                    data-reveal
                                    data-reveal-load-delay={`${120 + Math.min(index, 4) * 60}`}
                                    style={{
                                        "--reveal-delay": `${Math.min(index, 4) * 60}ms`,
                                    }}
                                    className="resources__card interactive-card">
                                    <div className="resources__card-media">
                                        {resource.image ? (
                                            <img
                                                src={resource.image}
                                                alt={resource.imageAlt}
                                                loading="lazy"
                                                decoding="async"
                                                sizes="(max-width: 480px) 100vw, 12rem"
                                            />
                                        ) : (
                                            <div className="resources__card-media-placeholder">
                                                Image placeholder
                                            </div>
                                        )}
                                    </div>
                                    <div className="resources__card-copy">
                                        <p className="resources__card-label">
                                            {resource.label}
                                        </p>
                                        <p className="resources__card-value">
                                            {resource.value}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </>
            ) : null}
        </div>
    );
}

export default People;
