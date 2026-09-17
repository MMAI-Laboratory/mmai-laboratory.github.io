import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import {
    PROGRAMMATIC_SCROLL_DURATION_MS,
    notifyProgrammaticScroll,
    scrollWindowTo,
} from "../utils/scrollMotion";

const SCROLL_RETRY_LIMIT = 40;
const SCROLL_RETRY_DELAY_MS = 50;
const TOP_SCROLL_MARGIN = 16;
const SCROLL_TARGET_CLASS = "scroll-target-highlight";
const SCROLL_TARGET_CLEAR_DELAY_MS = 1600;
// Content above the target can still settle after the scroll is computed (a
// late reflow shifts it by a card's height), which leaves the target stranded
// under the sticky nav. Re-check once the animation ends and correct.
const SETTLE_CHECK_DELAYS_MS = [PROGRAMMATIC_SCROLL_DURATION_MS + 60, 420];
const SETTLE_TOLERANCE_PX = 4;

let activeScrollTarget = null;
let scrollTargetTimeoutId = null;

const getScrollBehavior = () => "smooth";

const toPx = (value) => {
    const parsed = Number.parseFloat(value || "0");
    return Number.isFinite(parsed) ? parsed : 0;
};

const getTopOffset = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return 0;
    }

    const fixedNodes = document.querySelectorAll(".scroll-progress, .nav");
    let maxOffset = 0;

    fixedNodes.forEach((node) => {
        const style = window.getComputedStyle(node);
        if (style.position === "fixed" || style.position === "sticky") {
            const topInset = toPx(style.top);
            maxOffset = Math.max(
                maxOffset,
                node.getBoundingClientRect().height + topInset,
            );
        }
    });

    return maxOffset;
};

const toAbsoluteTop = (element) =>
    window.scrollY + element.getBoundingClientRect().top;

const getHighlightTarget = (target) =>
    target.closest(
        [
            ".people__degree-header",
            ".section-start-head",
            ".publication__section-head",
            ".research__section-head",
            ".page-controls__intro",
            ".news-page__year-head",
        ].join(", "),
    ) ?? target;

const highlightScrollTarget = (target) => {
    if (
        typeof window === "undefined" ||
        !target ||
        !target.classList ||
        typeof target.getBoundingClientRect !== "function"
    ) {
        return;
    }

    if (scrollTargetTimeoutId !== null) {
        window.clearTimeout(scrollTargetTimeoutId);
        scrollTargetTimeoutId = null;
    }

    if (activeScrollTarget && activeScrollTarget !== target) {
        activeScrollTarget.classList.remove(SCROLL_TARGET_CLASS);
    }

    const highlightTarget = getHighlightTarget(target);

    activeScrollTarget = highlightTarget;
    highlightTarget.classList.remove(SCROLL_TARGET_CLASS);
    highlightTarget.getBoundingClientRect();
    highlightTarget.classList.add(SCROLL_TARGET_CLASS);

    scrollTargetTimeoutId = window.setTimeout(() => {
        highlightTarget.classList.remove(SCROLL_TARGET_CLASS);
        if (activeScrollTarget === highlightTarget) {
            activeScrollTarget = null;
        }
        scrollTargetTimeoutId = null;
    }, SCROLL_TARGET_CLEAR_DELAY_MS);
};

const scrollToWindowTop = (behavior) => {
    notifyProgrammaticScroll();
    scrollWindowTo({ top: 0, behavior, notify: false });
    return true;
};

const preserveScrollPosition = () => true;

const scrollToTopOfContent = (behavior) => {
    const pageRoot = document.querySelector(".main-content__body");
    if (!pageRoot) {
        return false;
    }

    const topOffset = getTopOffset();
    const absoluteTop = toAbsoluteTop(pageRoot) - topOffset - TOP_SCROLL_MARGIN;
    notifyProgrammaticScroll();
    scrollWindowTo({ top: absoluteTop, behavior, notify: false });

    return true;
};

let settleTimeoutIds = [];

const clearSettleCorrection = () => {
    settleTimeoutIds.forEach((id) => window.clearTimeout(id));
    settleTimeoutIds = [];
};

// After the smooth scroll ends, verify the target actually sits below the nav
// and jump the remaining distance if a late reflow moved it.
const scheduleSettleCorrection = (element, clearance) => {
    clearSettleCorrection();

    settleTimeoutIds = SETTLE_CHECK_DELAYS_MS.map((delay) =>
        window.setTimeout(() => {
            if (!element.isConnected) {
                return;
            }

            const drift = element.getBoundingClientRect().top - clearance;
            if (Math.abs(drift) <= SETTLE_TOLERANCE_PX) {
                return;
            }

            notifyProgrammaticScroll(0);
            scrollWindowTo({
                top: window.scrollY + drift,
                behavior: "auto",
                notify: false,
            });
        }, delay),
    );
};

const scrollToSelector = ({ selector, block = "start" }, behavior) => {
    if (!selector) {
        return false;
    }

    const target = document.querySelector(selector);
    if (!target) {
        return false;
    }

    const highlightTarget = getHighlightTarget(target);
    const topOffset = getTopOffset();
    const absoluteTop = toAbsoluteTop(highlightTarget);
    const safeViewportHeight = Math.max(window.innerHeight - topOffset, 0);
    const centerOffset = Math.max(
        (safeViewportHeight - highlightTarget.getBoundingClientRect().height) /
            2,
        0,
    );
    // scroll-margin-top only applies to native anchor jumps, so honour it here
    // as a floor: it is what the stylesheet declares as the clearance the
    // sticky nav needs, and it stays correct if the nav is measured mid-animation.
    const declaredMargin = toPx(
        window.getComputedStyle(highlightTarget).scrollMarginTop,
    );
    const startClearance = Math.max(
        topOffset + TOP_SCROLL_MARGIN,
        declaredMargin,
    );
    const nextTop =
        block === "center"
            ? absoluteTop - centerOffset - topOffset
            : absoluteTop - startClearance;

    notifyProgrammaticScroll();
    scrollWindowTo({ top: nextTop, behavior, notify: false });
    highlightScrollTarget(target);

    if (block !== "center") {
        scheduleSettleCorrection(highlightTarget, startClearance);
    }

    return true;
};

const getEscapedIdSelector = (rawHash) => {
    if (!rawHash || rawHash === "#") {
        return "";
    }

    const decoded = decodeURIComponent(rawHash.replace(/^#/, "")).trim();
    if (!decoded) {
        return "";
    }

    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return `#${CSS.escape(decoded)}`;
    }

    return `#${decoded.replace(/[^a-zA-Z0-9\-_:.]/g, "")}`;
};

function RouteScrollManager() {
    const location = useLocation();
    const navigationType = useNavigationType();

    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return undefined;
        }

        const behavior = getScrollBehavior();
        const stateInstruction = location.state?.scroll ?? null;
        const hashSelector = getEscapedIdSelector(location.hash);
        const instruction =
            navigationType === "POP"
                ? hashSelector
                    ? {
                          mode: "selector",
                          selector: hashSelector,
                          block: "start",
                      }
                    : null
                : stateInstruction
                  ? stateInstruction
                  : hashSelector
                    ? {
                          mode: "selector",
                          selector: hashSelector,
                          block: "start",
                      }
                    : { mode: "top" };

        if (!instruction) {
            return undefined;
        }

        let cancelled = false;
        let timeoutId = null;
        let attempt = 0;

        const tryScroll = () => {
            if (cancelled) {
                return;
            }

            const didScroll =
                instruction.mode === "selector"
                    ? scrollToSelector(instruction, behavior)
                    : instruction.mode === "preserve"
                      ? preserveScrollPosition()
                      : instruction.mode === "window-top"
                        ? scrollToWindowTop(behavior)
                        : scrollToTopOfContent(behavior);

            if (didScroll) {
                return;
            }

            if (attempt >= SCROLL_RETRY_LIMIT) {
                if (instruction.mode === "selector") {
                    scrollToTopOfContent(behavior);
                }
                return;
            }

            attempt += 1;
            timeoutId = window.setTimeout(() => {
                window.requestAnimationFrame(tryScroll);
            }, SCROLL_RETRY_DELAY_MS);
        };

        window.requestAnimationFrame(tryScroll);

        return () => {
            cancelled = true;
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            clearSettleCorrection();
        };
    }, [location, navigationType]);

    return null;
}

export default RouteScrollManager;
