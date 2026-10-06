/* eslint-disable react/prop-types */
// "Sheet 수집" panel. MMAI has no lab sites to crawl (the AAIG panel this
// replaces), so collecting means reading the sheet again and listing what in
// it has not reached the site yet. The site side is the publication data this
// page was built with, i.e. exactly what is deployed.
import { useMemo } from "react";
import { findPendingSheetChanges } from "../../utils/publicationSheetRules";
import { formatDateTime } from "./adminApi";

const CHANGE_LABELS = {
    added: "추가 예정",
    changed: "수정 예정",
    removed: "내림 예정",
};

function SheetCollection({
    rowsState,
    siteItems,
    sync,
    disabled,
    onCollect,
    onOpenRow,
}) {
    const changes = useMemo(
        () =>
            rowsState.status === "ready"
                ? findPendingSheetChanges(rowsState.rows, siteItems)
                : [],
        [rowsState.rows, rowsState.status, siteItems],
    );
    const collecting = rowsState.status === "loading";
    const syncIsActive = sync.run && sync.run.status !== "completed";

    const summary = (() => {
        if (collecting) return "Google Sheet를 읽는 중입니다.";
        if (rowsState.status !== "ready") return "";
        return `마지막 수집 ${formatDateTime(rowsState.readAt)} · Sheet ${rowsState.rows.length}행 · 홈페이지에 아직 없는 변경 ${changes.length}건`;
    })();

    const nextStep = (() => {
        if (changes.length === 0) return "";
        if (syncIsActive)
            return "동기화가 진행 중입니다. 끝나면 검토 PR이 만들어집니다.";
        if (sync.pullRequest) {
            return `검토 PR #${sync.pullRequest.number}을 병합하면 홈페이지에 반영됩니다. 그 뒤 이 페이지를 새로 고치면 목록이 비워집니다.`;
        }
        return "지금 동기화를 누르면 검토 PR이 만들어집니다.";
    })();

    return (
        <section
            className="admin-candidates"
            aria-labelledby="admin-collection-title"
            aria-busy={collecting}>
            <div className="admin-candidates__head">
                <div>
                    <h3 id="admin-collection-title">Sheet 수집</h3>
                    <p aria-live="polite">{summary}</p>
                </div>
                <div className="admin-sync__actions">
                    <button
                        className="admin-button"
                        type="button"
                        onClick={onCollect}
                        disabled={disabled || collecting}>
                        {collecting ? "수집 중…" : "지금 수집"}
                    </button>
                </div>
            </div>

            {nextStep ? <p className="admin-sync__note">{nextStep}</p> : null}

            {changes.length > 0 ? (
                <ul className="admin-sheet-list admin-candidates__list">
                    {changes.map((change) => (
                        <li
                            key={`${change.kind}-${change.row?.rowNumber ?? change.values.id}`}>
                            <div className="admin-sheet-list__body">
                                <p className="admin-sheet-list__meta">
                                    <span
                                        className={`admin-pill admin-pill--${change.kind === "removed" ? "idle" : "active"}`}>
                                        {CHANGE_LABELS[change.kind]}
                                    </span>
                                    <span>{change.values.venue}</span>
                                    <span>{change.values.date}</span>
                                    {change.row ? (
                                        <span>{change.row.rowNumber}행</span>
                                    ) : null}
                                </p>
                                <h4>{change.values.title}</h4>
                                <p className="admin-sheet-list__authors">
                                    {change.kind === "changed"
                                        ? `바뀐 항목: ${change.fields.join(", ")}`
                                        : change.kind === "removed"
                                          ? change.row
                                              ? "Sheet에서 숨김 처리되어 홈페이지에서 내려갑니다."
                                              : "Sheet에서 행이 삭제되어 홈페이지에서 내려갑니다."
                                          : "Sheet에 새로 들어온 Publication입니다."}
                                </p>
                            </div>
                            {change.row ? (
                                <div className="admin-candidates__actions">
                                    <button
                                        className="admin-button"
                                        type="button"
                                        onClick={() => onOpenRow(change.row)}
                                        disabled={disabled}
                                        aria-label={`Sheet ${change.row.rowNumber}행 열기`}>
                                        행 열기
                                    </button>
                                </div>
                            ) : null}
                        </li>
                    ))}
                </ul>
            ) : null}

            {rowsState.status === "ready" && changes.length === 0 ? (
                <p className="admin-sync__note">
                    Sheet의 Publication이 모두 홈페이지에 반영되어 있습니다.
                </p>
            ) : null}
        </section>
    );
}

export default SheetCollection;
