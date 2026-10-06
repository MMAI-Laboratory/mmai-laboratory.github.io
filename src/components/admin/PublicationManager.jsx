/* eslint-disable react/prop-types */
// Publication editor for the mmai_publications tab of the shared Google Sheet. Ported from
// the AAIG PublicationSheetEditor, without the lab-site candidates panel and
// the labs column, and with MMAI's accepted_date and editable new-row id.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    RESEARCH_AREA_ORDER,
    RESEARCH_CATEGORY_LABELS,
} from "../../utils/researchData";
import {
    PUBLICATION_SHEET_COLUMNS,
    PUBLICATION_STATUSES,
    SHEET_FALSE_VALUES,
    suggestPublicationId,
    toSlug,
    validateSheetRowForSave,
} from "../../utils/publicationSheetRules";
import { formatDateTime, requestJson } from "./adminApi";
import PUBLICATION_DATA from "../../generated/publications.generated.json";
import SheetCollection from "./SheetCollection";

const CATEGORY_KEYS = new Set(RESEARCH_AREA_ORDER);
// What the deployed site was built with, for the "Sheet 수집" comparison.
const SITE_ITEMS = PUBLICATION_DATA?.items ?? [];
const STATUS_LABELS = {
    published: "게재",
    working: "진행 중인 연구",
    project: "프로젝트",
};
const LIST_PREVIEW_COUNT = 20;
const SYNC_POLL_INTERVAL_MS = 15_000;
const SYNC_POLL_LIMIT = 40;
// An unsaved edit survives a session timeout or reload in this tab only. It
// holds publication text, never credentials.
const DRAFT_STORAGE_KEY = "mmai-admin-publication-draft";

const EMPTY_ROW = Object.fromEntries(
    PUBLICATION_SHEET_COLUMNS.map((column) => [column, ""]),
);

const createBlankRow = () => ({
    ...EMPTY_ROW,
    enabled: "TRUE",
    featured: "FALSE",
    status: "published",
    category: RESEARCH_AREA_ORDER[0] ?? "",
});

const isSheetFalse = (value) =>
    SHEET_FALSE_VALUES.has(
        String(value ?? "")
            .trim()
            .toLowerCase(),
    );

const isRowVisible = (values) => !isSheetFalse(values.enabled);

const readStoredDraft = () => {
    try {
        const stored = JSON.parse(
            window.sessionStorage.getItem(DRAFT_STORAGE_KEY) || "null",
        );
        return stored?.draft ? stored : null;
    } catch {
        return null;
    }
};

const storeDraft = (editing) => {
    try {
        if (editing) {
            window.sessionStorage.setItem(
                DRAFT_STORAGE_KEY,
                JSON.stringify({
                    mode: editing.mode,
                    rowNumber: editing.rowNumber,
                    original: editing.original,
                    idTouched: editing.idTouched,
                    draft: editing.draft,
                }),
            );
        } else {
            window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        }
    } catch {
        // Storage can be unavailable in private windows; editing still works.
    }
};

const isDraftChanged = (editing) =>
    Boolean(editing) &&
    PUBLICATION_SHEET_COLUMNS.some(
        (column) =>
            String(editing.draft[column] ?? "").trim() !==
            String(editing.original[column] ?? "").trim(),
    );

const describeRun = (run) => {
    if (!run) return { tone: "idle", label: "기록 없음" };
    if (run.status !== "completed") {
        return { tone: "active", label: "동기화 중" };
    }
    if (run.conclusion === "success") {
        return { tone: "success", label: "최근 동기화 성공" };
    }
    return { tone: "failure", label: "최근 동기화 실패" };
};

function FieldError({ id, message }) {
    if (!message) return null;
    return (
        <p className="admin-field__error" id={id}>
            {message}
        </p>
    );
}

function PublicationRowForm({
    editing,
    venueOptions,
    onChange,
    onCancel,
    onSubmit,
    onReload,
}) {
    const { draft, fieldErrors, formError, saving, conflict, mode } = editing;
    const formId = `admin-publication-form-${editing.rowNumber ?? "new"}`;
    const fieldId = (column) => `${formId}-${column}`;
    const errorFor = (column) => fieldErrors[column];
    const describedBy = (column, hintId) =>
        [errorFor(column) ? `${fieldId(column)}-error` : "", hintId ?? ""]
            .filter(Boolean)
            .join(" ") || undefined;

    const setValue = (column) => (event) =>
        onChange(column, event.target.value);
    const setFlag = (column) => (event) =>
        onChange(column, event.target.checked ? "TRUE" : "FALSE");

    const textField = (
        column,
        label,
        { type = "text", hint, wide, list } = {},
    ) => (
        <div className={`admin-field${wide ? " admin-field--wide" : ""}`}>
            <label htmlFor={fieldId(column)}>{label}</label>
            <input
                id={fieldId(column)}
                type={type}
                value={draft[column]}
                onChange={setValue(column)}
                aria-invalid={errorFor(column) ? "true" : undefined}
                aria-describedby={describedBy(
                    column,
                    hint ? `${fieldId(column)}-hint` : undefined,
                )}
                list={list}
                autoComplete="off"
            />
            {hint ? (
                <p className="admin-field__hint" id={`${fieldId(column)}-hint`}>
                    {hint}
                </p>
            ) : null}
            <FieldError
                id={`${fieldId(column)}-error`}
                message={errorFor(column)}
            />
        </div>
    );

    return (
        <form
            className="admin-editor"
            aria-labelledby={`${formId}-heading`}
            onSubmit={onSubmit}
            noValidate>
            <div className="admin-editor__head">
                <h3 id={`${formId}-heading`} tabIndex={-1}>
                    {mode === "create"
                        ? "새 Publication 추가"
                        : `Sheet ${editing.rowNumber}행 수정`}
                </h3>
                <p>
                    {mode === "create"
                        ? "ID는 대표 그림과 News 연결에 쓰이며, 저장한 뒤에는 바뀌지 않습니다."
                        : draft.id
                          ? `ID ${draft.id} · 대표 그림과 News 연결에 쓰이므로 바뀌지 않습니다.`
                          : "ID는 동기화할 때 제목으로 자동 생성됩니다."}
                </p>
            </div>

            {formError ? (
                <div className="admin-editor__alert" role="alert">
                    <p>{formError}</p>
                    {conflict ? (
                        <button type="button" onClick={onReload}>
                            최신 내용 불러오기
                        </button>
                    ) : null}
                </div>
            ) : null}

            <div className="admin-editor__grid">
                {textField("title", "제목", { wide: true })}
                {textField("authors", "저자", {
                    wide: true,
                    hint: "화면에 보이는 그대로 씁니다. 예: Seunghun Kang, Jongbin Ryu",
                })}
                {textField("venue", "학회·저널", {
                    wide: true,
                    list: `${formId}-venues`,
                    hint: "정식 이름과 약칭을 함께 씁니다. 예: Conference on Robot Learning (CoRL)",
                })}
                {textField("date", "게재일", { type: "date" })}
                {textField("accepted_date", "채택일", {
                    type: "date",
                    hint: "비워도 됩니다. 있으면 News의 채택 소식 날짜로 쓰입니다.",
                })}

                <div className="admin-field">
                    <label htmlFor={fieldId("category")}>연구 분야</label>
                    <select
                        id={fieldId("category")}
                        value={draft.category}
                        onChange={setValue("category")}
                        aria-invalid={errorFor("category") ? "true" : undefined}
                        aria-describedby={describedBy("category")}>
                        {CATEGORY_KEYS.has(draft.category) ? null : (
                            <option value={draft.category}>
                                {draft.category || "선택해주세요"}
                            </option>
                        )}
                        {RESEARCH_AREA_ORDER.map((key) => (
                            <option key={key} value={key}>
                                {RESEARCH_CATEGORY_LABELS[key] ?? key}
                            </option>
                        ))}
                    </select>
                    <FieldError
                        id={`${fieldId("category")}-error`}
                        message={errorFor("category")}
                    />
                </div>

                <div className="admin-field">
                    <label htmlFor={fieldId("status")}>상태</label>
                    <select
                        id={fieldId("status")}
                        value={draft.status || "published"}
                        onChange={setValue("status")}
                        aria-invalid={errorFor("status") ? "true" : undefined}
                        aria-describedby={describedBy("status")}>
                        {PUBLICATION_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {STATUS_LABELS[status]} ({status})
                            </option>
                        ))}
                    </select>
                    <FieldError
                        id={`${fieldId("status")}-error`}
                        message={errorFor("status")}
                    />
                </div>

                {mode === "create"
                    ? textField("id", "ID", {
                          wide: true,
                          hint: "분야·연도·제목으로 자동 제안됩니다. 필요하면 고칠 수 있습니다.",
                      })
                    : null}

                {textField("keywords", "키워드", {
                    wide: true,
                    hint: "여러 개는 | 로 구분합니다. 비워도 됩니다.",
                })}
                {textField("arxiv_url", "arXiv 주소", { type: "url" })}
                {textField("pdf_url", "PDF 주소", { type: "url" })}
                {textField("github_url", "GitHub 주소", { type: "url" })}
                {textField("project_url", "프로젝트·논문 페이지", {
                    type: "url",
                })}

                <div className="admin-field admin-field--wide">
                    <label htmlFor={fieldId("summary")}>요약</label>
                    <textarea
                        id={fieldId("summary")}
                        rows={3}
                        value={draft.summary}
                        onChange={setValue("summary")}
                    />
                </div>

                <div className="admin-field admin-field--wide">
                    <label htmlFor={fieldId("notes")}>운영 메모</label>
                    <textarea
                        id={fieldId("notes")}
                        rows={2}
                        value={draft.notes}
                        onChange={setValue("notes")}
                        aria-describedby={`${fieldId("notes")}-hint`}
                    />
                    <p
                        className="admin-field__hint"
                        id={`${fieldId("notes")}-hint`}>
                        홈페이지에는 표시되지 않습니다.
                    </p>
                </div>

                <div className="admin-field admin-field--wide admin-field--choices">
                    <div>
                        <label>
                            <input
                                type="checkbox"
                                checked={!isSheetFalse(draft.enabled)}
                                onChange={setFlag("enabled")}
                            />
                            홈페이지에 표시
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={
                                    draft.featured.trim().toLowerCase() ===
                                    "true"
                                }
                                onChange={setFlag("featured")}
                            />
                            대표 Publication으로 강조
                        </label>
                    </div>
                </div>
            </div>

            <datalist id={`${formId}-venues`}>
                {venueOptions.map((venue) => (
                    <option key={venue} value={venue} />
                ))}
            </datalist>

            <div className="admin-editor__actions">
                <button
                    className="admin-button admin-button--primary"
                    type="submit"
                    disabled={saving}>
                    {saving ? "저장 중…" : "Sheet에 저장"}
                </button>
                <button
                    className="admin-button"
                    type="button"
                    onClick={onCancel}
                    disabled={saving}>
                    취소
                </button>
            </div>
        </form>
    );
}

function PublicationManager({ apiUrl, session, onSessionExpired }) {
    const [rowsState, setRowsState] = useState({
        status: "loading",
        rows: [],
        error: "",
    });
    const [reloadRequest, setReloadRequest] = useState(0);
    const [query, setQuery] = useState("");
    const [showAll, setShowAll] = useState(false);
    const [editing, setEditing] = useState(null);
    const [notice, setNotice] = useState(null);
    const [sync, setSync] = useState({ status: "loading" });
    const [syncPolls, setSyncPolls] = useState(0);
    const restoredDraftRef = useRef(false);
    const returnFocusRef = useRef("");

    const handleFailure = useCallback(
        (error) => {
            if (error.status === 401) onSessionExpired();
        },
        [onSessionExpired],
    );

    useEffect(() => {
        let cancelled = false;
        setRowsState((current) => ({ ...current, status: "loading" }));
        requestJson(`${apiUrl}/v1/publications/rows`, session.credential)
            .then((payload) => {
                if (cancelled) return;
                setRowsState({
                    status: "ready",
                    rows: payload.rows,
                    readAt: payload.readAt,
                    error: "",
                });
            })
            .catch((error) => {
                if (cancelled) return;
                handleFailure(error);
                setRowsState({
                    status: error.payload?.setupRequired ? "setup" : "error",
                    rows: [],
                    error: error.message,
                });
            });

        return () => {
            cancelled = true;
        };
    }, [apiUrl, handleFailure, reloadRequest, session.credential]);

    const loadSyncStatus = useCallback(async () => {
        try {
            const payload = await requestJson(
                `${apiUrl}/v1/publications/sync`,
                session.credential,
            );
            setSync({ status: "ready", ...payload });
            return payload;
        } catch (error) {
            handleFailure(error);
            setSync({
                status: error.status === 503 ? "setup" : "error",
                error: error.message,
            });
            return null;
        }
    }, [apiUrl, handleFailure, session.credential]);

    useEffect(() => {
        loadSyncStatus();
    }, [loadSyncStatus]);

    // A dispatched run takes a few minutes, so the status is refreshed on a
    // slow timer only while a run is still going.
    const syncIsActive =
        sync.status === "ready" && sync.run && sync.run.status !== "completed";
    useEffect(() => {
        if (!syncIsActive || syncPolls >= SYNC_POLL_LIMIT) return undefined;
        const timer = setTimeout(() => {
            setSyncPolls((count) => count + 1);
            loadSyncStatus();
        }, SYNC_POLL_INTERVAL_MS);
        return () => clearTimeout(timer);
    }, [loadSyncStatus, syncIsActive, syncPolls]);

    // Until a stored draft has had its chance to be restored, leave it alone:
    // clearing it on mount would lose the edit a session timeout interrupted.
    useEffect(() => {
        if (!restoredDraftRef.current) return;
        storeDraft(isDraftChanged(editing) ? editing : null);
    }, [editing]);

    useEffect(() => {
        if (rowsState.status !== "ready" || restoredDraftRef.current) return;
        restoredDraftRef.current = true;

        const stored = readStoredDraft();
        if (!stored) return;
        setEditing({
            ...stored,
            fieldErrors: {},
            formError: "",
            saving: false,
            conflict: false,
        });
        setNotice({
            tone: "info",
            text: "저장하지 않은 수정 내용을 복구했습니다. 확인한 뒤 저장해주세요.",
        });
    }, [rowsState.status]);

    // Move focus into a newly opened form, and back to the button that opened
    // it once the form closes, so keyboard users never lose their place.
    const formKey = editing ? String(editing.rowNumber ?? "new") : "";
    // Focus the first invalid field only after the error text has rendered,
    // so screen readers announce the field together with its message.
    const [pendingFocus, setPendingFocus] = useState("");
    useEffect(() => {
        if (!pendingFocus || !formKey) return;
        (
            document.getElementById(
                `admin-publication-form-${formKey}-${pendingFocus}`,
            ) ??
            document.getElementById(`admin-publication-form-${formKey}-heading`)
        )?.focus();
        setPendingFocus("");
    }, [formKey, pendingFocus]);
    useEffect(() => {
        if (formKey) {
            document
                .getElementById(`admin-publication-form-${formKey}-heading`)
                ?.focus();
            return;
        }
        if (returnFocusRef.current) {
            document.getElementById(returnFocusRef.current)?.focus();
            returnFocusRef.current = "";
        }
    }, [formKey]);

    const venueOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    rowsState.rows
                        .map((row) => row.values.venue.trim())
                        .filter(Boolean),
                ),
            ).sort((a, b) => a.localeCompare(b)),
        [rowsState.rows],
    );

    const sortedRows = useMemo(
        () =>
            [...rowsState.rows].sort(
                (a, b) =>
                    String(b.values.date).localeCompare(
                        String(a.values.date),
                    ) || a.rowNumber - b.rowNumber,
            ),
        [rowsState.rows],
    );

    const matchingRows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return sortedRows;
        return sortedRows.filter((row) =>
            [
                row.values.title,
                row.values.authors,
                row.values.venue,
                row.values.id,
            ]
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery),
        );
    }, [query, sortedRows]);

    const visibleRows =
        showAll || query.trim()
            ? matchingRows
            : matchingRows.slice(0, LIST_PREVIEW_COUNT);
    const hiddenCount = rowsState.rows.filter(
        (row) => !isRowVisible(row.values),
    ).length;
    const isDirty = isDraftChanged(editing);
    // A restored or searched-away row still needs its open form on screen.
    const editingRowIsOffList =
        editing?.mode === "edit" &&
        !visibleRows.some((row) => row.rowNumber === editing.rowNumber);

    const existingIds = useCallback(
        () => rowsState.rows.map((row) => row.values),
        [rowsState.rows],
    );

    const openEditor = (row) => {
        returnFocusRef.current = row
            ? `admin-row-edit-${row.rowNumber}`
            : "admin-publication-add";
        setNotice(null);
        const original = row
            ? { ...EMPTY_ROW, ...row.values }
            : createBlankRow();
        setEditing({
            mode: row ? "edit" : "create",
            rowNumber: row?.rowNumber ?? null,
            original,
            draft: { ...original },
            idTouched: false,
            fieldErrors: {},
            formError: "",
            saving: false,
            conflict: false,
        });
    };

    const closeEditor = () => setEditing(null);

    // A new row's id follows its area, year and title until the operator
    // types an id of their own.
    const updateDraft = (column, value) =>
        setEditing((current) => {
            const draft = { ...current.draft, [column]: value };
            const idTouched = current.idTouched || column === "id";
            if (current.mode === "create" && !idTouched) {
                draft.id = draft.title.trim()
                    ? suggestPublicationId(draft, existingIds())
                    : "";
            }
            return {
                ...current,
                draft,
                idTouched,
                fieldErrors: { ...current.fieldErrors, [column]: "" },
            };
        });

    const reloadAfterConflict = () => {
        setEditing(null);
        setNotice({
            tone: "info",
            text: "Sheet의 최신 내용을 불러왔습니다. 해당 행을 다시 열어 수정해주세요.",
        });
        setReloadRequest((count) => count + 1);
    };

    const focusFirstError = (errors) => {
        const firstField = PUBLICATION_SHEET_COLUMNS.find(
            (column) => errors[column],
        );
        if (firstField) setPendingFocus(firstField);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!editing || editing.saving) return;

        const errors = Object.fromEntries(
            validateSheetRowForSave(editing.draft, {
                categories: CATEGORY_KEYS,
            })
                .reverse()
                .map(({ field, message }) => [field, message]),
        );
        const others = rowsState.rows.filter(
            (row) => row.rowNumber !== editing.rowNumber,
        );
        const titleKey = toSlug(editing.draft.title);
        const duplicateTitle = others.find(
            (row) => titleKey && toSlug(row.values.title) === titleKey,
        );
        if (duplicateTitle && !errors.title) {
            errors.title = `같은 제목이 이미 Sheet ${duplicateTitle.rowNumber}행에 있습니다.`;
        }
        const draftId = editing.draft.id.trim();
        const duplicateId =
            editing.mode === "create" &&
            draftId &&
            others.find((row) => row.values.id.trim() === draftId);
        if (duplicateId && !errors.id) {
            errors.id = `같은 ID가 이미 Sheet ${duplicateId.rowNumber}행에 있습니다.`;
        }
        if (Object.keys(errors).length > 0) {
            setEditing((current) => ({
                ...current,
                fieldErrors: errors,
                formError: "표시된 항목을 고친 뒤 다시 저장해주세요.",
                conflict: false,
            }));
            focusFirstError(errors);
            return;
        }

        setEditing((current) => ({
            ...current,
            saving: true,
            formError: "",
            conflict: false,
        }));

        try {
            const isUpdate = editing.mode === "edit";
            const payload = await requestJson(
                isUpdate
                    ? `${apiUrl}/v1/publications/rows/${editing.rowNumber}`
                    : `${apiUrl}/v1/publications/rows`,
                session.credential,
                {
                    method: isUpdate ? "PUT" : "POST",
                    body: JSON.stringify({
                        expected: isUpdate ? editing.original : undefined,
                        values: editing.draft,
                    }),
                },
            );

            setRowsState((current) => ({
                ...current,
                rows: isUpdate
                    ? current.rows.map((row) =>
                          row.rowNumber === editing.rowNumber
                              ? payload.row
                              : row,
                      )
                    : payload.row.rowNumber
                      ? [...current.rows, payload.row]
                      : current.rows,
            }));
            if (!isUpdate) {
                returnFocusRef.current = "admin-publication-add";
                if (!payload.row.rowNumber) {
                    setReloadRequest((count) => count + 1);
                }
            }
            setEditing(null);
            setNotice({
                tone: "success",
                text: payload.sync?.started
                    ? `Sheet ${payload.row.rowNumber ?? ""}행에 저장하고 동기화를 시작했습니다. 검토 PR이 만들어지면 병합해야 홈페이지에 반영됩니다.`
                    : `Sheet에 저장했습니다. ${payload.sync?.message ?? ""}`,
            });
            if (payload.sync?.started) {
                setSyncPolls(0);
                setSync((current) => ({
                    ...current,
                    status: "ready",
                    run: {
                        ...(current.run ?? {}),
                        status: "queued",
                        conclusion: null,
                        createdAt: new Date().toISOString(),
                    },
                }));
                setTimeout(loadSyncStatus, 5000);
            }
        } catch (error) {
            handleFailure(error);
            const serverErrors = Object.fromEntries(
                (error.payload?.fieldErrors ?? [])
                    .slice()
                    .reverse()
                    .map(({ field, message }) => [field, message]),
            );
            setEditing((current) =>
                current
                    ? {
                          ...current,
                          saving: false,
                          fieldErrors: serverErrors,
                          conflict: error.status === 409,
                          formError:
                              error.status === 401
                                  ? "로그인이 만료되었습니다. 다시 로그인하면 수정 내용이 복구됩니다."
                                  : error.message,
                      }
                    : current,
            );
            focusFirstError(serverErrors);
        }
    };

    const handleSyncNow = async () => {
        setSync((current) => ({ ...current, starting: true }));
        try {
            await requestJson(
                `${apiUrl}/v1/publications/sync`,
                session.credential,
                {
                    method: "POST",
                },
            );
            setSyncPolls(0);
            setNotice({
                tone: "success",
                text: "동기화를 시작했습니다. Sheet에서 직접 고친 내용도 함께 반영됩니다.",
            });
            setTimeout(loadSyncStatus, 5000);
        } catch (error) {
            handleFailure(error);
            setNotice({ tone: "error", text: error.message });
        } finally {
            setSync((current) => ({ ...current, starting: false }));
        }
    };

    const runSummary = describeRun(sync.run);
    const formProps = {
        editing,
        venueOptions,
        onChange: updateDraft,
        onCancel: closeEditor,
        onSubmit: handleSubmit,
        onReload: reloadAfterConflict,
    };

    return (
        <div className="admin-sheet-editor">
            {sync.status === "ready" ? (
                <div className="admin-sync" aria-live="polite">
                    <div className="admin-sync__state">
                        <span
                            className={`admin-pill admin-pill--${runSummary.tone}`}>
                            {runSummary.label}
                        </span>
                        {sync.run?.createdAt ? (
                            <span>
                                {formatDateTime(sync.run.createdAt)} 시작
                            </span>
                        ) : null}
                        {sync.run?.url ? (
                            <a
                                href={sync.run.url}
                                target="_blank"
                                rel="noreferrer">
                                실행 기록
                            </a>
                        ) : null}
                    </div>
                    <div className="admin-sync__actions">
                        {sync.pullRequest ? (
                            <a
                                className="admin-button admin-button--primary"
                                href={sync.pullRequest.url}
                                target="_blank"
                                rel="noreferrer">
                                검토 PR #{sync.pullRequest.number} 열기
                            </a>
                        ) : null}
                        <button
                            className="admin-button"
                            type="button"
                            onClick={handleSyncNow}
                            disabled={sync.starting || syncIsActive}>
                            {sync.starting ? "요청 중…" : "지금 동기화"}
                        </button>
                    </div>
                    <p className="admin-sync__note">
                        {sync.pullRequest
                            ? "검토 PR을 병합하면 홈페이지에 배포됩니다."
                            : "저장하면 동기화가 자동으로 시작되고, 변경이 있으면 검토 PR이 만들어집니다."}
                    </p>
                </div>
            ) : null}
            {sync.status === "setup" ? (
                <p className="admin-sync__note">
                    동기화 상태를 보려면 Worker에 GITHUB_ACTIONS_TOKEN을
                    등록해야 합니다. 저장한 내용은 매일 예약된 동기화 때
                    반영됩니다.
                </p>
            ) : null}
            {sync.status === "error" ? (
                <div className="admin-editor__alert" role="alert">
                    <p>{sync.error}</p>
                    <button type="button" onClick={loadSyncStatus}>
                        다시 시도
                    </button>
                </div>
            ) : null}

            {rowsState.status === "ready" ||
            (rowsState.status === "loading" && rowsState.rows.length > 0) ? (
                <SheetCollection
                    rowsState={rowsState}
                    siteItems={SITE_ITEMS}
                    sync={sync}
                    disabled={isDirty}
                    onCollect={() => setReloadRequest((count) => count + 1)}
                    onOpenRow={openEditor}
                />
            ) : null}

            <div className="admin-sheet-editor__notice" aria-live="polite">
                {notice ? (
                    <p className={`admin-notice admin-notice--${notice.tone}`}>
                        {notice.text}
                    </p>
                ) : null}
            </div>

            {rowsState.status === "setup" ? (
                <div className="admin-state admin-state--setup">
                    <strong>Publication 편집 설정이 필요합니다.</strong>
                    <p>
                        Worker에 Google 서비스 계정 키를 등록하고 Sheet에
                        편집자로 추가하면 이 영역에서 바로 수정할 수 있습니다.
                        설정 방법은 docs/admin/README.md에 있습니다.
                    </p>
                </div>
            ) : null}

            {rowsState.status === "error" ? (
                <div className="admin-state admin-state--error" role="alert">
                    <strong>Sheet를 불러오지 못했습니다.</strong>
                    <p>{rowsState.error}</p>
                    <div className="admin-state__actions">
                        <button
                            type="button"
                            onClick={() =>
                                setReloadRequest((count) => count + 1)
                            }>
                            다시 시도
                        </button>
                    </div>
                </div>
            ) : null}

            {rowsState.status === "loading" && rowsState.rows.length === 0 ? (
                <div className="admin-analytics-skeleton" role="status">
                    <span>Google Sheet를 불러오는 중입니다.</span>
                    <div />
                    <div />
                </div>
            ) : null}

            {rowsState.rows.length > 0 || rowsState.status === "ready" ? (
                <>
                    <div className="admin-sheet-toolbar">
                        <div className="admin-publication-search">
                            <label htmlFor="admin-publication-search">
                                Sheet 검색
                            </label>
                            <input
                                id="admin-publication-search"
                                type="search"
                                placeholder="제목, 저자, 학회 또는 ID"
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                            />
                        </div>
                        <div className="admin-sheet-toolbar__actions">
                            <button
                                id="admin-publication-add"
                                className="admin-button admin-button--primary"
                                type="button"
                                onClick={() => openEditor(null)}
                                disabled={isDirty}>
                                새 Publication 추가
                            </button>
                            <button
                                className="admin-button"
                                type="button"
                                onClick={() =>
                                    setReloadRequest((count) => count + 1)
                                }
                                disabled={
                                    isDirty || rowsState.status === "loading"
                                }>
                                새로 불러오기
                            </button>
                        </div>
                    </div>

                    <p className="admin-sheet-editor__summary">
                        Sheet {rowsState.rows.length}행
                        {hiddenCount > 0 ? ` · 숨김 ${hiddenCount}행` : ""}
                        {query.trim()
                            ? ` · 검색 결과 ${matchingRows.length}행`
                            : ""}
                        {isDirty
                            ? " · 수정 중인 내용을 저장하거나 취소하면 다른 행을 열 수 있습니다."
                            : ""}
                    </p>

                    {editing?.mode === "create" || editingRowIsOffList ? (
                        <PublicationRowForm {...formProps} />
                    ) : null}

                    <ul className="admin-sheet-list">
                        {visibleRows.map((row) =>
                            editing?.mode === "edit" &&
                            editing.rowNumber === row.rowNumber ? (
                                <li key={row.rowNumber}>
                                    <PublicationRowForm {...formProps} />
                                </li>
                            ) : (
                                <li
                                    key={row.rowNumber}
                                    className={
                                        isRowVisible(row.values)
                                            ? undefined
                                            : "is-hidden"
                                    }>
                                    <div className="admin-sheet-list__body">
                                        <p className="admin-sheet-list__meta">
                                            <span>{row.values.venue}</span>
                                            <span>{row.values.date}</span>
                                            <span>{row.rowNumber}행</span>
                                            {isRowVisible(row.values) ? null : (
                                                <span className="admin-pill admin-pill--idle">
                                                    숨김
                                                </span>
                                            )}
                                        </p>
                                        <h3>{row.values.title}</h3>
                                        <p className="admin-sheet-list__authors">
                                            {row.values.authors}
                                        </p>
                                    </div>
                                    <button
                                        id={`admin-row-edit-${row.rowNumber}`}
                                        className="admin-button"
                                        type="button"
                                        onClick={() => openEditor(row)}
                                        disabled={isDirty}
                                        aria-label={`${row.values.title} 수정`}>
                                        수정
                                    </button>
                                </li>
                            ),
                        )}
                    </ul>

                    {visibleRows.length === 0 ? (
                        <p className="admin-publication-list__empty">
                            검색 결과가 없습니다.
                        </p>
                    ) : null}

                    {!showAll &&
                    !query.trim() &&
                    matchingRows.length > LIST_PREVIEW_COUNT ? (
                        <button
                            className="admin-button admin-sheet-list__more"
                            type="button"
                            onClick={() => setShowAll(true)}>
                            전체 {matchingRows.length}행 보기
                        </button>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}

export default PublicationManager;
