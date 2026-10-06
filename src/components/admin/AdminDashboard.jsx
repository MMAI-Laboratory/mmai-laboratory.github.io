/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadGoogleIdentity, readIdentityClaims } from "./googleIdentity";
import PublicationManager from "./PublicationManager";
import "./AdminDashboard.css";

const ADMIN_API_URL = (import.meta.env.VITE_ADMIN_API_URL ?? "").replace(
    /\/$/,
    "",
);
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const REPOSITORY_URL =
    "https://github.com/MMAI-Laboratory/mmai-laboratory.github.io";
// Link to the mmai_publications tab of the publication sheet; without it the section links
// to the synced snapshot on GitHub instead.
const PUBLICATIONS_SHEET_URL = import.meta.env.VITE_PUBLICATIONS_SHEET_URL ?? "";

const numberFormatter = new Intl.NumberFormat("ko-KR");
const formatNumber = (value) => numberFormatter.format(Number(value) || 0);

const isFiniteNumber = (value) =>
    typeof value === "number" && Number.isFinite(value);

const normalizeAnalyticsPayload = (payload) => {
    const hasValidTotals =
        payload?.totals &&
        isFiniteNumber(payload.totals.pageViews) &&
        isFiniteNumber(payload.totals.visits);
    const hasValidSeries =
        Array.isArray(payload?.series) &&
        payload.series.every(
            (item) =>
                typeof item?.date === "string" &&
                isFiniteNumber(item.pageViews) &&
                isFiniteNumber(item.visits),
        );
    const hasValidTopPages =
        Array.isArray(payload?.topPages) &&
        payload.topPages.every(
            (item) =>
                typeof item?.path === "string" &&
                isFiniteNumber(item.pageViews),
        );

    if (!hasValidTotals || !hasValidSeries || !hasValidTopPages) {
        throw new Error("통계 서버가 올바르지 않은 응답을 반환했습니다.");
    }

    return {
        ...payload,
        referrers: Array.isArray(payload.referrers) ? payload.referrers : [],
        countries: Array.isArray(payload.countries) ? payload.countries : [],
        devices: Array.isArray(payload.devices) ? payload.devices : [],
    };
};

function AdminMetric({ label, value, detail }) {
    return (
        <article className="admin-metric">
            <p>{label}</p>
            <strong>{value}</strong>
            <span>{detail}</span>
        </article>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="admin-analytics-skeleton" role="status">
            <span>Cloudflare 통계를 불러오는 중입니다.</span>
            <div />
            <div />
            <div />
        </div>
    );
}

function BreakdownList({ title, items, emptyLabel, fallbackLabel }) {
    return (
        <article>
            <h3>{title}</h3>
            {items.length > 0 ? (
                <ol>
                    {items.map((item, index) => (
                        <li key={`${item.label}-${index}`}>
                            <span>{item.label || fallbackLabel}</span>
                            <strong>{formatNumber(item.pageViews)}</strong>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="admin-breakdown__empty">{emptyLabel}</p>
            )}
        </article>
    );
}

function AdminDashboard() {
    const [days, setDays] = useState(30);
    // The credential is kept in memory only. A reload drops it, and the One
    // Tap prompt below has Google re-issue it silently for an account that
    // already consented, so nothing has to be stored to stay signed in.
    const [session, setSession] = useState(null);
    const [signInStatus, setSignInStatus] = useState("idle");
    const [analytics, setAnalytics] = useState(null);
    const [analyticsStatus, setAnalyticsStatus] = useState(
        ADMIN_API_URL ? "signed-out" : "unconfigured",
    );
    const [analyticsError, setAnalyticsError] = useState("");
    // Only the Worker knows the operator allow list, so a successful response
    // is what proves this account may see the workspace. Holding a Google
    // session is not enough on its own: anyone can obtain one.
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [retryRequest, setRetryRequest] = useState(0);
    const googleButtonRef = useRef(null);
    // After an explicit sign-out the next sign-in waits for a click, so the
    // operator can pick another account instead of being signed straight
    // back in.
    const signedOutRef = useRef(false);

    useEffect(() => {
        const previousTitle = document.title;
        const robotsMeta = document.querySelector('meta[name="robots"]');
        const previousRobots = robotsMeta?.getAttribute("content") ?? "";

        document.title = "Admin · MMAI Lab";
        robotsMeta?.setAttribute("content", "noindex,nofollow,noarchive");

        return () => {
            document.title = previousTitle;
            robotsMeta?.setAttribute("content", previousRobots);
        };
    }, []);

    const handleCredential = useCallback((response) => {
        const credential = response?.credential;
        if (!credential) return;

        signedOutRef.current = false;
        const claims = readIdentityClaims(credential);
        setAnalyticsError("");
        setSession({
            credential,
            email: claims.email,
            expiresAt: claims.expiresAt,
        });
    }, []);

    useEffect(() => {
        if (!ADMIN_API_URL || !GOOGLE_CLIENT_ID || session) {
            return undefined;
        }

        let cancelled = false;
        setSignInStatus("loading");

        loadGoogleIdentity()
            .then((identity) => {
                if (cancelled || !googleButtonRef.current) return;

                identity.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleCredential,
                    auto_select: true,
                    cancel_on_tap_outside: false,
                    use_fedcm_for_prompt: true,
                    itp_support: true,
                });
                identity.renderButton(googleButtonRef.current, {
                    theme: "outline",
                    size: "large",
                    text: "signin_with",
                    shape: "rectangular",
                    locale: "ko",
                });
                setSignInStatus("ready");
                // auto_select only acts through the One Tap prompt: for an
                // account that already consented, Google returns a fresh
                // credential without a click. That is what keeps a reload,
                // or the hourly token expiry, from asking to sign in again.
                if (!signedOutRef.current) identity.prompt();
            })
            .catch(() => {
                if (!cancelled) setSignInStatus("error");
            });

        return () => {
            cancelled = true;
            window.google?.accounts?.id?.cancel();
        };
    }, [handleCredential, session]);

    // Google ID tokens last an hour. Locking the screen exactly when the token
    // dies keeps the UI honest instead of waiting for the next failed request.
    useEffect(() => {
        if (!session?.expiresAt) return undefined;

        const remaining = session.expiresAt - Date.now();
        const expire = () => {
            setSession(null);
            setIsAuthorized(false);
            setAnalytics(null);
            setAnalyticsStatus("signed-out");
            setAnalyticsError("로그인이 만료되었습니다. 다시 로그인해주세요.");
        };

        if (remaining <= 0) {
            expire();
            return undefined;
        }

        const timer = setTimeout(expire, remaining);
        return () => clearTimeout(timer);
    }, [session]);

    useEffect(() => {
        if (!ADMIN_API_URL || !session) {
            return undefined;
        }

        const controller = new AbortController();
        const loadAnalytics = async () => {
            setAnalyticsStatus("loading");
            setAnalyticsError("");

            try {
                const response = await fetch(
                    `${ADMIN_API_URL}/v1/analytics?days=${days}`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.credential}`,
                        },
                        signal: controller.signal,
                    },
                );
                const payload = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const failure = new Error(
                        payload.error || "통계 데이터를 불러오지 못했습니다.",
                    );
                    failure.status = response.status;
                    throw failure;
                }

                setAnalytics(normalizeAnalyticsPayload(payload));
                setAnalyticsStatus("ready");
                setIsAuthorized(true);
            } catch (error) {
                if (error.name === "AbortError") return;
                setAnalytics(null);
                setAnalyticsError(error.message);

                if (error.status === 401) {
                    // Turn off silent re-sign-in first: if the rejection came
                    // from a configuration mismatch rather than expiry, Google
                    // would otherwise hand back a credential at once and loop.
                    window.google?.accounts?.id?.disableAutoSelect();
                    setSession(null);
                    setIsAuthorized(false);
                    setAnalyticsStatus("signed-out");
                    return;
                }

                // A 403 means the account is not on the allow list, so
                // retrying with the same credential can never succeed.
                if (error.status === 403) {
                    setIsAuthorized(false);
                    setAnalyticsStatus("denied");
                    return;
                }

                setAnalyticsStatus("error");
            }
        };

        loadAnalytics();
        return () => controller.abort();
    }, [days, retryRequest, session]);

    const maxSeriesValue = Math.max(
        1,
        ...(analytics?.series ?? []).map((item) => item.pageViews),
    );

    const handleSignOut = () => {
        // Without this Google would silently sign the same account back in,
        // which makes "다른 계정으로 로그인" impossible.
        window.google?.accounts?.id?.disableAutoSelect();
        signedOutRef.current = true;
        setSession(null);
        setIsAuthorized(false);
        setAnalytics(null);
        setAnalyticsError("");
        setAnalyticsStatus("signed-out");
    };

    // A save that comes back 401 means the credential expired between the
    // timer check and the request; signing in again resumes from there.
    const handleSessionExpired = useCallback(() => {
        window.google?.accounts?.id?.disableAutoSelect();
        setSession(null);
        setIsAuthorized(false);
        setAnalytics(null);
        setAnalyticsStatus("signed-out");
        setAnalyticsError("로그인이 만료되었습니다. 다시 로그인해주세요.");
    }, []);

    const handleRetry = () => {
        setRetryRequest((requestNumber) => requestNumber + 1);
    };

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div>
                    <p className="admin-header__label">Private workspace</p>
                    <h1>MMAI Lab 관리자</h1>
                    <p>홈페이지 방문 통계와 콘텐츠 운영 상태를 확인합니다.</p>
                </div>
                <Link className="admin-header__back" to="/">
                    홈페이지로 돌아가기
                </Link>
            </header>

            <section className="admin-section" aria-labelledby="analytics-title">
                <div className="admin-section__head">
                    <div>
                        <h2 id="analytics-title">접속 통계</h2>
                        <p>Cloudflare Web Analytics의 집계 데이터입니다.</p>
                    </div>
                    {["ready", "loading"].includes(analyticsStatus) &&
                    analytics ? (
                        <div
                            className="admin-period"
                            role="group"
                            aria-label="통계 기간">
                            {[7, 30].map((period) => (
                                <button
                                    key={period}
                                    type="button"
                                    className={
                                        days === period ? "is-active" : ""
                                    }
                                    aria-pressed={days === period}
                                    disabled={analyticsStatus === "loading"}
                                    onClick={() => setDays(period)}>
                                    {period}일
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                {analyticsStatus === "unconfigured" ? (
                    <div className="admin-state admin-state--setup">
                        <strong>Cloudflare 연결 설정이 필요합니다.</strong>
                        <p>
                            Worker를 배포한 뒤 빌드 환경변수
                            VITE_ADMIN_API_URL에 주소를 등록하면 이 영역이
                            활성화됩니다.
                        </p>
                    </div>
                ) : null}

                {analyticsStatus === "signed-out" ? (
                    <div className="admin-signin">
                        <div className="admin-signin__intro">
                            <strong>관리자 로그인</strong>
                            <p>
                                등록된 운영자 Google 계정으로만 통계를 볼 수
                                있습니다. 로그인은 1시간 동안 유지되며 이
                                브라우저에 저장되지 않습니다.
                            </p>
                        </div>

                        {GOOGLE_CLIENT_ID ? (
                            <div className="admin-signin__google">
                                <div ref={googleButtonRef} />
                                {signInStatus === "error" ? (
                                    <p
                                        className="admin-signin__error"
                                        role="alert">
                                        Google 로그인을 불러오지 못했습니다.
                                        네트워크 연결을 확인한 뒤 페이지를
                                        새로고침해주세요.
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <p className="admin-signin__notice">
                                Google 로그인이 아직 설정되지 않았습니다. 빌드
                                환경변수 VITE_GOOGLE_CLIENT_ID를 등록하면 이
                                영역에 로그인 버튼이 나타납니다.
                            </p>
                        )}

                        {analyticsError ? (
                            <p className="admin-signin__error" role="alert">
                                {analyticsError}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {analyticsStatus === "denied" ? (
                    <div
                        className="admin-state admin-state--error"
                        role="alert">
                        <strong>이 계정에는 관리자 권한이 없습니다.</strong>
                        <p>
                            {session?.email
                                ? `${session.email} 계정으로 로그인했습니다. `
                                : ""}
                            {analyticsError}
                        </p>
                        <div className="admin-state__actions">
                            <button type="button" onClick={handleSignOut}>
                                다른 계정으로 로그인
                            </button>
                        </div>
                    </div>
                ) : null}

                {analyticsStatus === "loading" && !analytics ? (
                    <AnalyticsSkeleton />
                ) : null}

                {analyticsStatus === "error" ? (
                    <div
                        className="admin-state admin-state--error"
                        role="alert">
                        <strong>통계 연결을 확인해주세요.</strong>
                        <p>{analyticsError}</p>
                        <div className="admin-state__actions">
                            <button type="button" onClick={handleRetry}>
                                다시 시도
                            </button>
                            <button type="button" onClick={handleSignOut}>
                                로그아웃
                            </button>
                        </div>
                    </div>
                ) : null}

                {["ready", "loading"].includes(analyticsStatus) && analytics ? (
                    <div
                        className="admin-analytics"
                        aria-busy={analyticsStatus === "loading"}>
                        <div className="admin-metrics">
                            <AdminMetric
                                label={`${days}일 페이지뷰`}
                                value={formatNumber(analytics.totals.pageViews)}
                                detail="열린 페이지의 총합"
                            />
                            <AdminMetric
                                label={`${days}일 방문`}
                                value={formatNumber(analytics.totals.visits)}
                                detail="새로 시작된 방문 세션"
                            />
                            <AdminMetric
                                label="인기 페이지"
                                value={
                                    (analytics.topPages ?? [])[0]?.path ??
                                    "데이터 없음"
                                }
                                detail="가장 많이 본 경로"
                            />
                        </div>

                        <div className="admin-chart" aria-hidden="true">
                            {(analytics.series ?? []).map((item) => (
                                <div
                                    className="admin-chart__day"
                                    key={item.date}>
                                    <span
                                        className="admin-chart__bar"
                                        style={{
                                            "--bar-height": `${Math.max(4, (item.pageViews / maxSeriesValue) * 100)}%`,
                                        }}
                                        title={`${item.date}: ${formatNumber(item.pageViews)} 페이지뷰`}
                                    />
                                    <small>{item.date.slice(5)}</small>
                                </div>
                            ))}
                        </div>
                        <table className="admin-series-table">
                            <caption>{days}일 페이지뷰 추이 상세</caption>
                            <thead>
                                <tr>
                                    <th scope="col">날짜</th>
                                    <th scope="col">페이지뷰</th>
                                    <th scope="col">방문</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(analytics.series ?? []).map((item) => (
                                    <tr key={item.date}>
                                        <th scope="row">{item.date}</th>
                                        <td>{formatNumber(item.pageViews)}</td>
                                        <td>{formatNumber(item.visits)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="admin-breakdowns">
                            <BreakdownList
                                title="인기 페이지"
                                items={(analytics.topPages ?? [])
                                    .slice(0, 6)
                                    .map((item) => ({
                                        label: item.path,
                                        pageViews: item.pageViews,
                                    }))}
                                emptyLabel="선택한 기간의 페이지 데이터가 없습니다."
                                fallbackLabel="/"
                            />
                            <BreakdownList
                                title="주요 유입 경로"
                                items={analytics.referrers.slice(0, 6)}
                                emptyLabel="선택한 기간의 유입 데이터가 없습니다."
                                fallbackLabel="직접 방문"
                            />
                            <BreakdownList
                                title="방문 국가"
                                items={analytics.countries.slice(0, 6)}
                                emptyLabel="선택한 기간의 국가 데이터가 없습니다."
                                fallbackLabel="알 수 없음"
                            />
                            <BreakdownList
                                title="기기"
                                items={analytics.devices.slice(0, 6)}
                                emptyLabel="선택한 기간의 기기 데이터가 없습니다."
                                fallbackLabel="알 수 없음"
                            />
                        </div>
                        <div className="admin-session">
                            <p>
                                {session?.email
                                    ? `${session.email} 계정으로 확인 중입니다.`
                                    : "운영자 계정으로 확인 중입니다."}
                            </p>
                            <button
                                className="admin-lock"
                                type="button"
                                onClick={handleSignOut}>
                                로그아웃
                            </button>
                        </div>
                    </div>
                ) : null}
            </section>

            <section
                className="admin-section"
                aria-labelledby="publication-admin-title">
                <div className="admin-section__head">
                    <div>
                        <h2 id="publication-admin-title">Publication 관리</h2>
                        <p>
                            {isAuthorized
                                ? "Google Sheet(mmai_publications 탭)에 저장하면 동기화 후 검토 PR이 만들어지고, 병합하면 홈페이지에 반영됩니다."
                                : "운영자로 로그인하면 열립니다."}
                        </p>
                    </div>
                    {isAuthorized ? (
                        <a
                            className="admin-primary-link"
                            href={
                                PUBLICATIONS_SHEET_URL ||
                                `${REPOSITORY_URL}/blob/main/content/publications/sheet.snapshot.json`
                            }
                            target="_blank"
                            rel="noreferrer">
                            {PUBLICATIONS_SHEET_URL
                                ? "Google Sheet 열기"
                                : "GitHub에서 보기"}
                        </a>
                    ) : null}
                </div>

                {isAuthorized && session ? (
                    <PublicationManager
                        apiUrl={ADMIN_API_URL}
                        session={session}
                        onSessionExpired={handleSessionExpired}
                    />
                ) : (
                    <div className="admin-state">
                        <strong>운영자 확인이 필요합니다.</strong>
                        <p>
                            위에서 로그인하면 Publication 추가·수정이 함께
                            열립니다.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}

export default AdminDashboard;
