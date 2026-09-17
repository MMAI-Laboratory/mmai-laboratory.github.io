import { Link } from "react-router-dom";
import PeopleCard from "../People.Card";
import "../People.css";
import { getLatestPhotoItems, getPeopleSpotlight } from "./homeData";

const withBasePath = (relativePath) => {
    const basePath = import.meta.env.BASE_URL || "/";
    return `${basePath.replace(/\/+$/, "/")}${String(
        relativePath || "",
    ).replace(/^\/+/, "")}`;
};

export default function HomePeoplePreview() {
    const members = getPeopleSpotlight();
    const latestPhotos = getLatestPhotoItems(6);

    return (
        <section
            data-reveal
            data-reveal-load-delay="220"
            className="home-block home-people-preview"
            aria-labelledby="home-people-title">
            <div className="home-block__head">
                <div>
                    <h2 id="home-people-title">Members</h2>
                    <p>
                        Meet the professor and members behind current MMAI Lab
                        research.
                    </p>
                </div>
            </div>

            <div className="home-people__grid">
                {members.map((member, index) => (
                    <PeopleCard
                        key={member.id}
                        profile={member.image}
                        name={member.name}
                        email={member.email}
                        position={member.position}
                        homepage={member.homepage}
                        links={member.links}
                        research_interest={member.research_interests}
                        current_position={member.current_position}
                        revealDelay={`${index * 60}ms`}
                        revealLoadDelay={`${120 + index * 60}`}
                    />
                ))}
            </div>

            <section
                data-reveal
                data-reveal-load-delay="140"
                className="home-people__culture"
                aria-label="Recent lab culture photos">
                <div
                    className="home-people__culture-track"
                    aria-label="Recent lab photos">
                    {latestPhotos.map((photoItem) => (
                        <figure
                            key={photoItem.id}
                            className="home-people__culture-photo">
                            <img
                                src={withBasePath(
                                    photoItem.thumbnail || photoItem.full,
                                )}
                                alt={photoItem.alt || photoItem.title}
                                loading="lazy"
                                decoding="async"
                            />
                            <figcaption>{photoItem.title}</figcaption>
                        </figure>
                    ))}

                    <div className="home-people__culture-more-wrap">
                        <Link
                            to="/photo"
                            className="home-people__culture-more btn btn--secondary btn--sm interactive-button">
                            More
                        </Link>
                    </div>
                </div>
            </section>

            <div className="home-block__section-footer">
                <Link
                    to="/people"
                    state={{ scroll: { mode: "top" } }}
                    className="home-block__section-action btn btn--tertiary animated-underline">
                    View all members
                    <span className="home-block__section-action-icon">→</span>
                </Link>
            </div>
        </section>
    );
}
