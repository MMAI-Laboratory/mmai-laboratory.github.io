import { Suspense, lazy, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import MainContent from "./components/MainContent";
import Footer from "./components/Footer";
import ScrollProgress from "./components/ScrollProgress";
import BackToTopButton from "./components/BackToTopButton";
import RouteScrollManager from "./components/RouteScrollManager";
import CloudflareAnalytics from "./components/CloudflareAnalytics";
import AppRoutes from "./routes/AppRoutes";
import { resolveTabFromPath } from "./routes/routeUtils";
import "./App.css";

const CvlLab = lazy(() => import("./components/tabs/CvlLab"));

function InteractiveBackdrop() {
    const backdropRef = useRef(null);
    const gridRef = useRef(null);
    const cursorRef = useRef(null);

    useEffect(() => {
        const node = backdropRef.current;
        const grid = gridRef.current;
        const cursor = cursorRef.current;
        if (!node || !grid || !cursor || typeof window === "undefined") {
            return undefined;
        }

        const motionQuery = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
        );
        const pointerQuery = window.matchMedia?.(
            "(hover: hover) and (pointer: fine)",
        );
        const slowUpdateQuery = window.matchMedia?.("(update: slow)");
        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;
        const isConstrainedDevice =
            (Number.isFinite(navigator.deviceMemory) &&
                navigator.deviceMemory < 4) ||
            (Number.isFinite(navigator.hardwareConcurrency) &&
                navigator.hardwareConcurrency < 4);
        const gridShiftInitialDelay = 420;
        const gridShiftRestDuration = 5100;
        let frameId = 0;
        let gridShiftTimerId = 0;
        let isListening = false;
        let latestPointer = {
            x: window.innerWidth * 0.5,
            y: window.innerHeight * 0.42,
        };

        const resetTransforms = () => {
            grid.style.removeProperty("transform");
            cursor.style.removeProperty("transform");
        };

        const writePointer = () => {
            frameId = 0;
            const x = Math.min(
                1,
                Math.max(0, latestPointer.x / window.innerWidth),
            );
            const y = Math.min(
                1,
                Math.max(0, latestPointer.y / window.innerHeight),
            );
            const gridX = (x - 0.5) * -14;
            const gridY = (y - 0.5) * -10;

            grid.style.transform = `translate3d(${gridX.toFixed(2)}px, ${gridY.toFixed(2)}px, 0)`;
            cursor.style.transform = `translate3d(${latestPointer.x.toFixed(2)}px, ${latestPointer.y.toFixed(2)}px, 0) translate(-50%, -50%)`;
        };

        const handlePointerMove = (event) => {
            latestPointer = { x: event.clientX, y: event.clientY };
            if (!frameId) {
                frameId = window.requestAnimationFrame(writePointer);
            }
        };

        const getMotionState = () => {
            if (document.hidden) {
                return { mode: "static", reason: "document-hidden" };
            }
            if (motionQuery?.matches) {
                return { mode: "static", reason: "reduced-motion" };
            }
            if (slowUpdateQuery?.matches) {
                return { mode: "static", reason: "slow-update" };
            }
            if (connection?.saveData) {
                return { mode: "static", reason: "save-data" };
            }
            if (isConstrainedDevice) {
                return { mode: "static", reason: "constrained-device" };
            }
            if (!(pointerQuery?.matches ?? true)) {
                return { mode: "static", reason: "coarse-pointer" };
            }
            return { mode: "interactive", reason: "pointer" };
        };

        const stopGridShift = () => {
            if (gridShiftTimerId) {
                window.clearTimeout(gridShiftTimerId);
                gridShiftTimerId = 0;
            }
            grid.classList.remove("is-shifting");
        };

        const scheduleGridShift = (delay) => {
            if (
                gridShiftTimerId ||
                grid.classList.contains("is-shifting") ||
                getMotionState().mode !== "interactive"
            ) {
                return;
            }

            gridShiftTimerId = window.setTimeout(() => {
                gridShiftTimerId = 0;
                if (getMotionState().mode === "interactive") {
                    grid.classList.add("is-shifting");
                }
            }, delay);
        };

        const handleGridShiftEnd = (event) => {
            if (event.animationName !== "backdrop-grid-shift") {
                return;
            }
            grid.classList.remove("is-shifting");
            scheduleGridShift(gridShiftRestDuration);
        };

        const syncInteraction = () => {
            const motionState = getMotionState();
            const shouldListen = motionState.mode === "interactive";
            node.dataset.motion = motionState.mode;
            node.dataset.motionReason = motionState.reason;

            if (shouldListen) {
                scheduleGridShift(gridShiftInitialDelay);
            } else {
                stopGridShift();
            }

            if (shouldListen === isListening) {
                return;
            }

            isListening = shouldListen;
            if (shouldListen) {
                window.addEventListener("pointermove", handlePointerMove, {
                    passive: true,
                });
                return;
            }

            window.removeEventListener("pointermove", handlePointerMove);
            if (frameId) {
                window.cancelAnimationFrame(frameId);
                frameId = 0;
            }
            resetTransforms();
        };

        const mediaQueries = [motionQuery, pointerQuery, slowUpdateQuery].filter(
            Boolean,
        );
        mediaQueries.forEach((query) =>
            query.addEventListener?.("change", syncInteraction),
        );
        connection?.addEventListener?.("change", syncInteraction);
        document.addEventListener("visibilitychange", syncInteraction);
        grid.addEventListener("animationend", handleGridShiftEnd);
        syncInteraction();

        return () => {
            mediaQueries.forEach((query) =>
                query.removeEventListener?.("change", syncInteraction),
            );
            connection?.removeEventListener?.("change", syncInteraction);
            document.removeEventListener("visibilitychange", syncInteraction);
            grid.removeEventListener("animationend", handleGridShiftEnd);
            stopGridShift();
            if (isListening) {
                window.removeEventListener("pointermove", handlePointerMove);
            }
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, []);

    return (
        <div
            className="app-backdrop"
            ref={backdropRef}
            data-motion="static"
            data-motion-reason="initializing"
            aria-hidden="true">
            <div className="app-backdrop__grid" ref={gridRef} />
            <div className="app-backdrop__cursor" ref={cursorRef} />
        </div>
    );
}

// The factory keeps the lazy client tree and eager SSG tree structurally identical.
// eslint-disable-next-line react-refresh/only-export-components
export function createAppShell(HeroComponent, RoutesComponent) {
    return function AppShell() {
        const location = useLocation();
        const selectedTab = resolveTabFromPath(location.pathname);
        const appClassName = `app app--${selectedTab || "home"}`;

        return (
            <div className={appClassName} data-rendered-route={location.pathname}>
                <CloudflareAnalytics />
                <InteractiveBackdrop />
                <ScrollProgress />
                <RouteScrollManager />
                <div className="app__content site-shell">
                    <Nav />
                    {selectedTab === "home" ? (
                        <Suspense
                            fallback={
                                <div
                                    className="app__hero-loading"
                                    aria-hidden="true"
                                />
                            }>
                            <HeroComponent isHome />
                        </Suspense>
                    ) : null}
                    <MainContent selectedTab={selectedTab}>
                        <RoutesComponent />
                    </MainContent>
                </div>
                <BackToTopButton />
                <Footer />
            </div>
        );
    };
}

const App = createAppShell(CvlLab, AppRoutes);

export default App;
