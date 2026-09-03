import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import MailIcon from "../../icons/MailIcon";
import "../Contact.css";

const EMAIL_ADDRESS = "jongbinryu@ajou.ac.kr";
const MAIL_SUBJECT = encodeURIComponent("MMAI Lab Inquiry");
const MAIL_BODY = encodeURIComponent(
    "Hello MMAI Lab,\n\nI would like to ask about...\n\nName:\nAffiliation:\n",
);

export default function HomeCTA() {
    return (
        <section
            data-reveal
            data-reveal-load-delay="260"
            className="home-block home-cta"
            aria-labelledby="home-cta-title">
            <div className="home-cta__content">
                <div className="home-block__head home-cta__head">
                    <div>
                        <h2 id="home-cta-title">Contact</h2>
                    </div>
                </div>
                <p className="home-cta__institution">
                    We welcome inquiries from students, collaborators, and
                    anyone interested in our lab. Please feel free to contact us
                    using the contact information below. We work with many
                    academic and industrial partners on practical learning
                    algorithms and industrial AI applications
                </p>
            </div>
            <div className="home-cta__actions">
                <div className="contact__details">
                    <section
                        data-reveal
                        data-reveal-load-delay="300"
                        className="contact__panel contact__panel--address">
                        <p className="contact__panel-label">Address</p>
                        <p className="contact__panel-title">
                            Department of Artificial Intelligence, Ajou
                            University
                        </p>
                        <address className="contact__address-text">
                            Padal Hall, Room 624,
                            <br />
                            Department of Artificial Intelligence, Ajou
                            University,
                            <br />
                            206 World cup-ro, Yeongtong-gu,
                            <br />
                            Suwon 16499, Korea
                        </address>
                    </section>

                    <article
                        data-reveal
                        data-reveal-load-delay="340"
                        className="contact__panel contact__panel--email">
                        <p className="contact__panel-label">Email</p>
                        <p className="contact__panel-title">
                            General inquiries
                        </p>
                        <a
                            className="contact__email-link btn btn--tertiary animated-underline"
                            href={`mailto:${EMAIL_ADDRESS}`}>
                            {EMAIL_ADDRESS}
                        </a>
                        <p className="contact__email-note">
                            For collaboration, admissions, and project
                            inquiries, please include your affiliation and
                            topic.
                        </p>
                        <div className="contact__email-cta">
                            <a
                                className="contact__email-button btn btn--primary interactive-button lift-on-hover"
                                href={`mailto:${EMAIL_ADDRESS}?subject=${MAIL_SUBJECT}&body=${MAIL_BODY}`}>
                                <span className="contact__email-text">
                                    Contact us
                                </span>
                                <span className="contact__email-icon">
                                    <MailIcon className="icon-mail" />
                                </span>
                            </a>
                        </div>
                    </article>
                </div>
                <Link
                    to="/contact"
                    className="home-cta__info-btn home-cta__info-btn--primary btn btn--secondary interactive-button lift-on-hover">
                    <span>More Information</span>
                    <span
                        className="home-cta__info-btn-icon"
                        aria-hidden="true">
                        <FontAwesomeIcon icon={faArrowRight} />
                    </span>
                </Link>
            </div>
        </section>
    );
}
