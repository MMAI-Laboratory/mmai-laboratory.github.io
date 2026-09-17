import { useCallback, useEffect, useMemo, useRef } from "react";
import "./Research.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    getResearchAreas,
    resolveResearchTopic,
} from "../../utils/researchData";
import focusAreaSampleImage from "../../assets/images/research_concepts/optimized/focus-sample.svg";
import coreArchitectureImage from "../../assets/images/research_concepts/optimized/focus/core-architecture.webp";
import representationLearningImage from "../../assets/images/research_concepts/optimized/focus/representation-learning.webp";
import visionLanguageModelImage from "../../assets/images/research_concepts/optimized/focus/vision-language-model.webp";
import pruningImage from "../../assets/images/research_concepts/optimized/focus/pruning.webp";
import quantizationImage from "../../assets/images/research_concepts/optimized/focus/quantization.webp";
import efficientTransferLearningImage from "../../assets/images/research_concepts/optimized/focus/efficient-transfer-learning.webp";
import multimodalWorldModelImage from "../../assets/images/research_concepts/optimized/focus/multimodal-world-model.webp";
import robustGeneralizableVlaImage from "../../assets/images/research_concepts/optimized/focus/robust-generalizable-vla.webp";
import speechSoundVlaImage from "../../assets/images/research_concepts/optimized/focus/speech-sound-vla.webp";
import medicalImageDiagnosisImage from "../../assets/images/research_concepts/optimized/focus/medical-image-diagnosis.webp";
import realWorldVisualTrackingImage from "../../assets/images/research_concepts/optimized/focus/real-world-visual-tracking.webp";
import batteryPrognosticsImage from "../../assets/images/research_concepts/optimized/focus/battery-prognostics.webp";

const FOCUS_AREA_IMAGE_BY_TITLE = {
    "Core Architecture": coreArchitectureImage,
    "Representation Learning": representationLearningImage,
    "Vision-Language Model": visionLanguageModelImage,
    Pruning: pruningImage,
    Quantization: quantizationImage,
    "Efficient Transfer Learning": efficientTransferLearningImage,
    "Multimodal World Model": multimodalWorldModelImage,
    "Robust & Generalizable VLA": robustGeneralizableVlaImage,
    "Speech & Sound VLA": speechSoundVlaImage,
    "Medical Image Diagnosis": medicalImageDiagnosisImage,
    "Real-World Visual Tracking": realWorldVisualTrackingImage,
    "Battery Prognostics": batteryPrognosticsImage,
};
const NAV_KEYS = new Set(["ArrowRight", "ArrowLeft", "Home", "End"]);

const normalizeText = (value) =>
    typeof value === "string" ? value.trim() : "";

const buildDetailDescription = (area) => {
    if (!area) {
        return "";
    }

    const segments = [
        area.explanation,
        area.details?.abstract,
        area.details?.headline,
    ]
        .map((item) => normalizeText(item))
        .filter(Boolean);

    return Array.from(new Set(segments)).join(" ");
};

function Research({ selectedResearchTopic }) {
    const navigate = useNavigate();
    const location = useLocation();
    const tabRefs = useRef({});
    const researchContents = useMemo(() => getResearchAreas(), []);

    const currentTopicKey = useMemo(
        () => resolveResearchTopic(selectedResearchTopic),
        [selectedResearchTopic],
    );

    const areaPathByTopic = useMemo(
        () =>
            researchContents.reduce((acc, item) => {
                acc[item.topicKey] = item.path;
                return acc;
            }, {}),
        [researchContents],
    );

    const scrollToAreaPanel = useCallback((topicKey) => {
        if (typeof window === "undefined") {
            return;
        }

        const target = document.getElementById(`research-panel-${topicKey}`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    useEffect(() => {
        if (!currentTopicKey) {
            return undefined;
        }

        const frameId = window.requestAnimationFrame(() => {
            scrollToAreaPanel(currentTopicKey);
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [currentTopicKey, scrollToAreaPanel]);

    const navigateToArea = useCallback(
        (topicKey, focusAfterNavigation = false) => {
            const normalizedTopic = resolveResearchTopic(topicKey);
            if (!normalizedTopic) {
                return;
            }

            const nextPath = areaPathByTopic[normalizedTopic] || "/research";
            if (location.pathname !== nextPath) {
                navigate(nextPath, {
                    state: {
                        scroll: {
                            mode: "preserve",
                        },
                    },
                });
            }

            scrollToAreaPanel(normalizedTopic);

            if (focusAfterNavigation && typeof window !== "undefined") {
                window.requestAnimationFrame(() => {
                    tabRefs.current[normalizedTopic]?.focus();
                });
            }
        },
        [navigate, areaPathByTopic, location.pathname, scrollToAreaPanel],
    );

    const handleTabKeyDown = useCallback(
        (event, index) => {
            if (!NAV_KEYS.has(event.key) || !researchContents.length) {
                return;
            }

            event.preventDefault();
            let nextIndex = index;

            if (event.key === "ArrowRight") {
                nextIndex = (index + 1) % researchContents.length;
            } else if (event.key === "ArrowLeft") {
                nextIndex =
                    (index - 1 + researchContents.length) %
                    researchContents.length;
            } else if (event.key === "Home") {
                nextIndex = 0;
            } else if (event.key === "End") {
                nextIndex = researchContents.length - 1;
            }

            const nextTopic = researchContents[nextIndex]?.topicKey;
            if (nextTopic) {
                navigateToArea(nextTopic, true);
            }
        },
        [researchContents, navigateToArea],
    );

    return (
        <div
            data-reveal
            data-reveal-load-delay="60"
            className="research-wrapper">
            <div
                data-reveal
                className="tab-header page-head page-head--research">
                <h1>Research</h1>
                <p className="page-head__summary">
                    From foundational algorithms to real-world deployment,
                    MMAI Lab builds vision and learning systems that connect core
                    research, multimodal intelligence, robotics, and biomedical
                    impact.
                </p>
            </div>

            <section
                data-reveal
                className="research__details page-panel"
                aria-labelledby="research-area-details-title">
                <div className="research__section-head research__section-head--areas">
                    <div>
                        <h2 id="research-area-details-title">
                            Research Area
                        </h2>
                    </div>
                </div>

                <nav
                    className="research__detail-tabs"
                    aria-label="Jump to research area">
                    {researchContents.map((contentItem, index) => {
                        const isCurrent =
                            currentTopicKey === contentItem.topicKey;

                        return (
                            <button
                                key={contentItem.topicKey}
                                type="button"
                                ref={(node) => {
                                    if (node) {
                                        tabRefs.current[contentItem.topicKey] =
                                            node;
                                    }
                                }}
                                id={`research-tab-${contentItem.topicKey}`}
                                aria-current={isCurrent ? "true" : undefined}
                                tabIndex={isCurrent ? 0 : -1}
                                className={`research__detail-tab btn btn--secondary btn--sm interactive-button ${
                                    isCurrent ? "is-active" : ""
                                }`}
                                onClick={() =>
                                    navigateToArea(contentItem.topicKey)
                                }
                                onKeyDown={(event) =>
                                    handleTabKeyDown(event, index)
                                }>
                                {contentItem.title}
                            </button>
                        );
                    })}
                </nav>

                {researchContents.map((area) => {
                    const description = buildDetailDescription(area);

                    return (
                        <article
                            key={area.topicKey}
                            id={`research-panel-${area.topicKey}`}
                            aria-labelledby={`research-tab-${area.topicKey}`}
                            className="research__detail-panel">
                            <div className="research__detail-hero">
                                <figure className="research__detail-media">
                                    {area.image ? (
                                        <picture>
                                            {area.imageLandscape ? (
                                                <source
                                                    media="(max-width: 68rem)"
                                                    srcSet={
                                                        area.imageLandscape
                                                    }
                                                />
                                            ) : null}
                                            <img
                                                src={area.image}
                                                alt={area.imageAlt}
                                                loading="lazy"
                                                decoding="async"
                                                sizes="(max-width: 68rem) 22rem, 15rem"
                                            />
                                        </picture>
                                    ) : (
                                        <div className="research__detail-media-placeholder">
                                            Image placeholder
                                        </div>
                                    )}
                                </figure>

                                <header className="research__detail-panel-head">
                                    <p className="research__detail-kicker">
                                        Abstract
                                    </p>
                                    <h3>{area.title}</h3>
                                    {description ? (
                                        <p className="research__detail-description">
                                            {description}
                                        </p>
                                    ) : null}
                                    <div className="research__detail-keywords-group">
                                        <div
                                            className="research__detail-keywords"
                                            aria-label={`${area.title} keywords`}>
                                            {area.tags.map((keywordItem) => (
                                                <span
                                                    key={`${area.topicKey}-${keywordItem}`}
                                                    className="research__detail-keyword-chip">
                                                    {keywordItem}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </header>
                            </div>

                            <div className="research__detail-focus-areas">
                                {area.details.focusAreas.map((focusArea) => (
                                    <section
                                        key={focusArea.title}
                                        className="research__detail-focus-area interactive-card">
                                        <figure className="research__detail-focus-media">
                                            <img
                                                src={
                                                    FOCUS_AREA_IMAGE_BY_TITLE[
                                                        focusArea.title
                                                    ] || focusAreaSampleImage
                                                }
                                                alt={`${focusArea.title} figure`}
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        </figure>
                                        <div className="research__detail-focus-copy">
                                            <h4>{focusArea.title}</h4>
                                            <p>{focusArea.description}</p>
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </article>
                    );
                })}

                <div className="research__section-footer">
                    <Link
                        to="/publication"
                        className="btn btn--tertiary animated-underline">
                        Browse all publications
                    </Link>
                </div>
            </section>
        </div>
    );
}
export default Research;
