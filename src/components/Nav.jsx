import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import NavButton from "./Nav.Button";
import { resolveTabFromPath } from "../routes/routeUtils";
import {
    DARK_THEME,
    getDocumentTheme,
    LIGHT_THEME,
    THEME_CHANGE_EVENT,
} from "../utils/themeMode";
import { scrollWindowTo } from "../utils/scrollMotion";
import "./Nav.css";
import CVL_LAB_LOGO_LIGHT from "../assets/logo-light.svg";
import CVL_LAB_LOGO_DARK from "../assets/logo-dark.svg";

const MOBILE_NAV_QUERY = "(max-width: 57rem)";

const isPrimaryPlainClick = (event) =>
    (event.button === undefined || event.button === 0) &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey;

export default function Nav() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileNav, setIsMobileNav] = useState(false);
    const [themeMode, setThemeMode] = useState(LIGHT_THEME);
    const location = useLocation();
    const selectedTab = resolveTabFromPath(location.pathname);

    useEffect(() => {
        const handleThemeChange = (event) => {
            const nextTheme = event?.detail?.theme;
            if (nextTheme === DARK_THEME || nextTheme === LIGHT_THEME) {
                setThemeMode(nextTheme);
                return;
            }
            setThemeMode(getDocumentTheme());
        };

        if (typeof window !== "undefined") {
            window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
        }

        setThemeMode(getDocumentTheme());

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener(
                    THEME_CHANGE_EVENT,
                    handleThemeChange,
                );
            }
        };
    }, []);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname, location.hash]);

    useEffect(() => {
        if (
            typeof window === "undefined" ||
            typeof window.matchMedia !== "function"
        ) {
            return undefined;
        }

        const mediaQueryList = window.matchMedia(MOBILE_NAV_QUERY);
        const syncMobileState = (eventOrList) => {
            const matches =
                "matches" in eventOrList
                    ? eventOrList.matches
                    : mediaQueryList.matches;
            setIsMobileNav(matches);
            if (!matches) {
                setIsMenuOpen(false);
            }
        };

        syncMobileState(mediaQueryList);
        if (typeof mediaQueryList.addEventListener === "function") {
            mediaQueryList.addEventListener("change", syncMobileState);
        } else {
            mediaQueryList.addListener(syncMobileState);
        }

        return () => {
            if (typeof mediaQueryList.removeEventListener === "function") {
                mediaQueryList.removeEventListener("change", syncMobileState);
            } else {
                mediaQueryList.removeListener(syncMobileState);
            }
        };
    }, []);

    useEffect(() => {
        if (!isMobileNav || !isMenuOpen) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setIsMenuOpen(false);
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isMenuOpen, isMobileNav]);

    const toggleMenu = () => {
        if (!isMobileNav) {
            return;
        }
        setIsMenuOpen((prev) => !prev);
    };

    const handleSelectTab = (event) => {
        if (event?.currentTarget instanceof HTMLElement) {
            event.currentTarget.blur();
        }

        setIsMenuOpen(false);
    };

    const handleLogoClick = (event) => {
        handleSelectTab(event);
        if (selectedTab !== "home" || !isPrimaryPlainClick(event)) {
            return;
        }

        event.preventDefault();
        scrollWindowTo({ top: 0 });
    };

    const navLogoSrc =
        themeMode === DARK_THEME ? CVL_LAB_LOGO_DARK : CVL_LAB_LOGO_LIGHT;

    const tabs = [
        {
            key: "home",
            label: "Home",
        },
        {
            key: "news",
            label: "News",
        },
        {
            key: "research",
            label: "Research",
        },
        {
            key: "publication",
            label: "Publication",
        },
        {
            key: "people",
            label: "People",
        },
        {
            key: "photo",
            label: "Photo",
        },
        {
            key: "deadlines",
            label: "Conference",
        },
    ];

    return (
        <>
            {isMobileNav ? (
                <div
                    className={`nav__overlay ${isMenuOpen ? "is-visible" : ""}`}
                    onClick={toggleMenu}></div>
            ) : null}
            <div
                className={`nav animated-surface is-nav-visible ${isMenuOpen ? "is-menu-open" : ""}`}>
                <div className="nav__header">
                    <Link
                        to="/"
                        state={{ scroll: { mode: "window-top" } }}
                        className="nav__logo"
                        onClick={handleLogoClick}
                        aria-label="Go to Home">
                        <img
                            src={navLogoSrc}
                            alt="MMAI Lab logo"
                            decoding="async"
                            fetchPriority="high"
                        />
                    </Link>
                    {isMobileNav ? (
                        <div className="nav__header-actions">
                            <button
                                type="button"
                                className="nav__toggle btn btn--icon btn--sm interactive-button"
                                onClick={toggleMenu}
                                aria-expanded={isMenuOpen}
                                aria-controls="nav-links"
                                aria-label={
                                    isMenuOpen
                                        ? "Close navigation menu"
                                        : "Open navigation menu"
                                }>
                                <span
                                    className="nav__toggle-icon"
                                    aria-hidden="true">
                                    {isMenuOpen ? "✕" : "☰"}
                                </span>
                            </button>
                        </div>
                    ) : null}
                </div>
                <div
                    id="nav-links"
                    className={`nav__links animated-surface ${isMobileNav && !isMenuOpen ? "is-hidden" : ""}`}>
                    {tabs.map((tabItem, i) => (
                        <div key={tabItem.key + i} className="nav__item">
                            <NavButton
                                tabKey={tabItem.key}
                                isSelected={selectedTab === tabItem.key}
                                onSelect={handleSelectTab}>
                                {tabItem.label}
                            </NavButton>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
