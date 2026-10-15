import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// faLink is kept for the hidden Link icon below.
import { faFilePdf /* , faLink */ } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import "./Publication.LinkIcons.css";

// The arXiv mark is drawn as a small "arXiv" wordmark, so like the PDF icon
// it names its destination. Strokes use currentColor (muted when the link is
// missing); only the crossing stroke of the X carries arXiv red when active.
function ArxivWordmark() {
    return (
        <svg
            className="publication-link-icons__wordmark"
            viewBox="0 1 47 17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false">
            <circle cx="5.1" cy="12.4" r="3.4" />
            <path d="M8.5 8.8V16" />
            <path d="M12.6 8.8V16M12.6 12c0-2.1 1.5-3.2 3.8-3.2" />
            <path d="M29.6 2.8 19.6 16" />
            <path
                className="publication-link-icons__wordmark-accent"
                d="M19.6 2.8 29.6 16"
            />
            <circle
                cx="33.6"
                cy="4.6"
                r="1.4"
                fill="currentColor"
                stroke="none"
            />
            <path d="M33.6 8.8V16" />
            <path d="M37.4 8.8 41.2 16l3.8-7.2" />
        </svg>
    );
}

const LINK_ITEMS = [
    { key: "pdf", label: "PDF", icon: faFilePdf, metaKey: "pdf_link" },
    {
        key: "arxiv",
        label: "arXiv",
        Icon: ArxivWordmark,
        metaKey: "arxiv_link",
    },
    { key: "github", label: "GitHub", icon: faGithub, metaKey: "github_link" },
    // Link (paper page) icon — temporarily hidden; the data stays in the
    // sheet's project_url column, so restoring this line brings it back.
    // { key: "link", label: "Link", icon: faLink, metaKey: "project_link" },
];

const renderIcon = (item) =>
    item.Icon ? (
        <item.Icon />
    ) : (
        <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
    );

const normalizeText = (value) =>
    typeof value === "string" ? value.trim() : "";

const isValidHttpUrl = (url) => {
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
        return false;
    }
};

export const getPublicationPrimaryLink = (meta = {}) => {
    const orderedKeys = [
        "pdf_link",
        "arxiv_link",
        "project_link",
        "github_link",
        "paper_link",
        "source_code_link",
    ];

    for (const key of orderedKeys) {
        const value = normalizeText(meta?.[key]);
        if (isValidHttpUrl(value)) {
            return value;
        }
    }

    return "";
};

export default function PublicationLinkIcons({ meta = {}, className = "" }) {
    const rootClassName = `publication-link-icons ${className}`.trim();

    return (
        <div className={rootClassName} aria-label="Publication links">
            {LINK_ITEMS.map((item) => {
                const rawUrl = normalizeText(meta?.[item.metaKey]);
                const isActive = isValidHttpUrl(rawUrl);
                const itemClassName = "publication-link-icons__item";

                if (!isActive) {
                    return (
                        <span
                            key={item.key}
                            className={`${itemClassName} is-disabled`}
                            title={`${item.label} unavailable`}
                            aria-label={`${item.label} unavailable`}>
                            {renderIcon(item)}
                        </span>
                    );
                }

                return (
                    <a
                        key={item.key}
                        href={rawUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`${itemClassName} is-active`}
                        title={item.label}
                        aria-label={`Open ${item.label}`}>
                        {renderIcon(item)}
                    </a>
                );
            })}
        </div>
    );
}
