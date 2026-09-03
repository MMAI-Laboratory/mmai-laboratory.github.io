import "./Contact.css";
import HOME_MEDIA_IMAGES from "../../assets/images/home/home_media_index";
import MailIcon from "../icons/MailIcon";

function Contact() {
  const emailAddress = "jongbinryu@ajou.ac.kr";
  const mailSubject = encodeURIComponent("MMAI Lab Inquiry");
  const mailBody = encodeURIComponent(
    "Hello MMAI Lab,\n\nI would like to ask about...\n\nName:\nAffiliation:\n",
  );
  const mapMedia = HOME_MEDIA_IMAGES.research_environment || HOME_MEDIA_IMAGES.intro_meeting_room;

  return (
    <div data-reveal data-reveal-load-delay="60" className="contact">
      <div data-reveal className="tab-header page-head page-head--contact">
        <h1>Contact</h1>
        <p className="page-head__summary">
          Reach out for collaboration, admissions, and research partnership inquiries.
        </p>
      </div>
      <section data-reveal className="contact__body page-panel">
        <header data-reveal data-reveal-load-delay="60" className="contact__header">
          <p className="contact__kicker">Ajou University · MMAI Lab</p>
          <h2>Get in touch with MMAI Lab</h2>
          <p>We welcome collaboration inquiries, student applications, and research partnerships.</p>
        </header>

        <section
          data-reveal
          data-reveal-load-delay="100"
          className="contact__location contact__panel"
        >
          <div className="contact__location-intro">
            <p className="contact__panel-label">Location</p>
            <p className="contact__location-title">
              Padal Hall, Room 624
            </p>
            <p className="contact__location-copy">
              MMAI Lab is based at Ajou University in Suwon. Use the map for directions and the
              address panel below for mailing and campus delivery details.
            </p>
          </div>

          <div className="contact__location-media">
            {mapMedia ? (
              <figure className="contact__map-media">
                <img
                  src={mapMedia}
                  alt="MMAI Lab building and research environment at Ajou University"
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 92vw, 34rem"
                />
                <figcaption>Ajou University campus and MMAI Lab environment</figcaption>
              </figure>
            ) : null}
            <div className="contact__map-wrap">
              <iframe
                className="contact__map"
                src="https://www.google.com/maps?q=%EC%95%84%EC%A3%BC%EB%8C%80%ED%95%99%EA%B5%90%20%ED%8C%94%EB%8B%AC%EA%B4%80%20%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EC%88%98%EC%9B%90%EC%8B%9C%20%EC%98%81%ED%86%B5%EA%B5%AC%20%EC%9B%90%EC%B2%9C%EB%8F%99&output=embed"
                title="Ajou University MMAI Lab location map"
                loading="lazy"
              ></iframe>
            </div>
          </div>
        </section>

        <div className="contact__details">
          <section
            data-reveal
            data-reveal-load-delay="140"
            className="contact__panel contact__panel--address"
          >
            <p className="contact__panel-label">Address</p>
            <p className="contact__panel-title">Department of Artificial Intelligence, Ajou University</p>
            <address className="contact__address-text">
              Padal Hall, Room 624,<br />
              Department of Artificial Intelligence, Ajou University,<br />
              206 World cup-ro, Yeongtong-gu,<br />
              Suwon 16499, Korea
            </address>
          </section>

          <article
            data-reveal
            data-reveal-load-delay="180"
            className="contact__panel contact__panel--email"
          >
            <p className="contact__panel-label">Email</p>
            <p className="contact__panel-title">General inquiries</p>
            <a className="contact__email-link btn btn--tertiary animated-underline" href={`mailto:${emailAddress}`}>
              {emailAddress}
            </a>
            <p className="contact__email-note">
              For collaboration, admissions, and project inquiries, please include your affiliation
              and topic.
            </p>
            <div className="contact__email-cta">
              <a
                className="contact__email-button btn btn--primary interactive-button lift-on-hover"
                href={`mailto:${emailAddress}?subject=${mailSubject}&body=${mailBody}`}
              >
                <span className="contact__email-text">Contact us</span>
                <span className="contact__email-icon">
                  <MailIcon className="icon-mail" />
                </span>
              </a>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export default Contact;
