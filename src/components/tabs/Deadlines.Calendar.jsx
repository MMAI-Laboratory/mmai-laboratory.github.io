/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import {
    DEADLINE_DISPLAY_TIMEZONE,
    buildMonthGrid,
    formatDeadlineInDisplayTimezone,
    getConferenceSpans,
    getDeadlineCalendarEntries,
    toDisplayDayKey,
} from "../../utils/deadlineData";
import { getFlagSvg } from "../../assets/flags/flag_index";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
});

const SELECTED_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
});

const KIND_LABELS = {
    abstract: "Abstract",
    paper: "Paper",
    supplementary: "Supplementary",
    registration: "Registration",
    review: "Reviews / Rebuttal",
    rebuttal: "Rebuttal",
    decision: "Decision",
    notification: "Notification",
    camera_ready: "Camera-ready",
};

const parseDayKey = (dayKey) => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return { year, monthIndex: month - 1, day };
};

const FlagImg = ({ code, country, className }) =>
    getFlagSvg(code) ? (
        <img className={className} src={getFlagSvg(code)} alt={country ?? ""} />
    ) : null;

export default function DeadlineCalendar({ venues, now }) {
    const entriesByDay = useMemo(
        () => getDeadlineCalendarEntries(venues),
        [venues],
    );
    const spans = useMemo(() => getConferenceSpans(venues), [venues]);

    // `now` is null during prerender and on the first client render. Deriving
    // the month from `new Date()` there would differ between the build and the
    // browser, breaking hydration; instead fall back to a deterministic month
    // (the earliest tracked deadline) until the real clock arrives.
    const todayKey = now ? toDisplayDayKey(now) : null;
    const today = todayKey ? parseDayKey(todayKey) : null;

    const fallbackMonth = useMemo(() => {
        const keys = [...entriesByDay.keys()].sort();
        if (keys.length) {
            const { year, monthIndex } = parseDayKey(keys[0]);
            return { year, monthIndex };
        }
        return { year: 1970, monthIndex: 0 };
    }, [entriesByDay]);

    const [cursor, setCursor] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const activeCursor =
        cursor ??
        (today
            ? { year: today.year, monthIndex: today.monthIndex }
            : fallbackMonth);

    const grid = useMemo(
        () => buildMonthGrid(activeCursor.year, activeCursor.monthIndex),
        [activeCursor.year, activeCursor.monthIndex],
    );

    const spansForDay = (dayKey) =>
        spans.filter((span) => span.start <= dayKey && dayKey <= span.end);

    const monthLabel = MONTH_LABEL_FORMATTER.format(
        new Date(Date.UTC(activeCursor.year, activeCursor.monthIndex, 1)),
    );

    const monthDeadlineCount = grid.reduce(
        (total, cell) =>
            cell.inMonth ? total + (entriesByDay.get(cell.key)?.length ?? 0) : total,
        0,
    );

    const shiftMonth = (delta) =>
        setCursor((previous) => {
            const base = previous ?? activeCursor;
            const next = new Date(
                Date.UTC(base.year, base.monthIndex + delta, 1),
            );
            return {
                year: next.getUTCFullYear(),
                monthIndex: next.getUTCMonth(),
            };
        });

    const isCurrentMonth =
        today !== null &&
        activeCursor.year === today.year &&
        activeCursor.monthIndex === today.monthIndex;

    // The detail panel is shown only for an explicitly clicked day; clicking
    // the same day again clears it (toggle).
    const activeDay = selectedDay;
    const toggleDay = (dayKey) =>
        setSelectedDay((previous) => (previous === dayKey ? null : dayKey));
    const activeEntries = activeDay ? (entriesByDay.get(activeDay) ?? []) : [];
    const activeConferences = activeDay ? spansForDay(activeDay) : [];
    const activeDayLabel = activeDay
        ? (() => {
              const { year, monthIndex, day } = parseDayKey(activeDay);
              return SELECTED_DAY_FORMATTER.format(
                  new Date(Date.UTC(year, monthIndex, day)),
              );
          })()
        : "";

    return (
        <section
            data-reveal
            className="deadlines__calendar page-panel page-panel--compact"
            aria-labelledby="deadlines-calendar-title">
            <div className="deadlines__calendar-head">
                <div>
                    <h2 id="deadlines-calendar-title">Conference Calendar</h2>
                    <p>
                        {monthDeadlineCount} deadline
                        {monthDeadlineCount === 1 ? "" : "s"} in {monthLabel} ·
                        Times shown in {DEADLINE_DISPLAY_TIMEZONE}
                    </p>
                </div>
                <div className="deadlines__calendar-nav">
                    <button
                        type="button"
                        className="deadlines__calendar-nav-btn btn btn--icon btn--secondary btn--sm interactive-button"
                        onClick={() => shiftMonth(-1)}
                        aria-label={`Previous month, ${monthLabel}`}>
                        ‹
                    </button>
                    <p className="deadlines__calendar-month" aria-live="polite">
                        {monthLabel}
                    </p>
                    <button
                        type="button"
                        className="deadlines__calendar-nav-btn btn btn--icon btn--secondary btn--sm interactive-button"
                        onClick={() => shiftMonth(1)}
                        aria-label={`Next month, ${monthLabel}`}>
                        ›
                    </button>
                    <button
                        type="button"
                        className="deadlines__calendar-today btn btn--tertiary btn--sm interactive-button"
                        onClick={() => {
                            setCursor(null);
                            setSelectedDay(todayKey);
                        }}
                        disabled={isCurrentMonth}>
                        Today
                    </button>
                </div>
            </div>

            <div className="deadlines__calendar-grid" role="grid">
                <div className="deadlines__calendar-weekdays" role="row">
                    {WEEKDAY_LABELS.map((weekday) => (
                        <p
                            key={weekday}
                            role="columnheader"
                            className="deadlines__calendar-weekday">
                            {weekday}
                        </p>
                    ))}
                </div>

                <div className="deadlines__calendar-cells">
                    {grid.map((cell, cellIndex) => {
                        const dayEntries = entriesByDay.get(cell.key) ?? [];
                        const dayConferences = spansForDay(cell.key);
                        const isToday = cell.key === todayKey;
                        const isSelected = cell.key === activeDay;
                        const dayOfWeek = cellIndex % 7;

                        return (
                            <div
                                key={cell.key}
                                role="gridcell"
                                tabIndex={0}
                                onClick={() => toggleDay(cell.key)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                    ) {
                                        event.preventDefault();
                                        toggleDay(cell.key);
                                    }
                                }}
                                className={`deadlines__calendar-cell ${
                                    cell.inMonth ? "" : "is-outside"
                                } ${dayEntries.length || dayConferences.length ? "has-deadline" : ""} ${
                                    isSelected ? "is-selected" : ""
                                }`}>
                                <p
                                    className={`deadlines__calendar-date ${
                                        isToday ? "is-today" : ""
                                    }`}>
                                    {cell.day}
                                </p>
                                {/* Conference run bars (multi-day). Each run keeps
                                    a fixed lane, and empty lanes render as spacers,
                                    so overlapping runs stay on continuous rows.
                                    Adjacent days join via negative margins; the
                                    name repeats at each run/week start. */}
                                {(() => {
                                    const maxLane = dayConferences.reduce(
                                        (max, conf) => Math.max(max, conf.lane),
                                        -1,
                                    );
                                    return Array.from(
                                        { length: maxLane + 1 },
                                        (_unused, lane) => {
                                            const conf = dayConferences.find(
                                                (item) => item.lane === lane,
                                            );
                                            if (!conf) {
                                                return (
                                                    <div
                                                        key={`span-spacer-${lane}`}
                                                        className="deadlines__calendar-span-spacer"
                                                        aria-hidden="true"
                                                    />
                                                );
                                            }
                                            const isRunStart =
                                                conf.start === cell.key;
                                            const isRunEnd = conf.end === cell.key;
                                            const openLeft =
                                                !isRunStart && dayOfWeek !== 0;
                                            const openRight =
                                                !isRunEnd && dayOfWeek !== 6;
                                            const showName =
                                                isRunStart || dayOfWeek === 0;
                                            return (
                                                <div
                                                    key={`span-${conf.venueId}`}
                                                    className={`deadlines__calendar-span ${
                                                        openLeft
                                                            ? "is-open-left"
                                                            : ""
                                                    } ${openRight ? "is-open-right" : ""}`}
                                                    title={`${conf.name} · ${conf.dates}`}>
                                                    {showName ? (
                                                        <>
                                                            <FlagImg
                                                                code={conf.code}
                                                                country={
                                                                    conf.country
                                                                }
                                                                className="deadlines__calendar-span-flag"
                                                            />
                                                            {conf.name}
                                                        </>
                                                    ) : null}
                                                </div>
                                            );
                                        },
                                    );
                                })()}
                                {dayEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={`deadlines__calendar-entry deadlines__calendar-entry--${entry.kind}`}>
                                        <span className="deadlines__calendar-entry-venue">
                                            <FlagImg
                                                code={entry.code}
                                                country={entry.country}
                                                className="deadlines__calendar-entry-flag"
                                            />
                                            {entry.venueName}
                                        </span>
                                        <span className="deadlines__calendar-entry-label">
                                            {entry.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {activeDay ? (
                <div className="deadlines__calendar-detail" aria-live="polite">
                    <h3 className="deadlines__calendar-detail-date">
                        {activeDayLabel}
                    </h3>
                    {activeConferences.length === 0 &&
                    activeEntries.length === 0 ? (
                        <p className="deadlines__calendar-detail-empty">
                            No conference dates or deadlines on this day.
                        </p>
                    ) : null}

                    {activeConferences.map((conf) => (
                        <div
                            key={`detail-conf-${conf.venueId}`}
                            className="deadlines__calendar-detail-row">
                            <div className="deadlines__calendar-detail-main">
                                <p className="deadlines__calendar-detail-kind">
                                    Conference
                                </p>
                                <p className="deadlines__calendar-detail-venue">
                                    <FlagImg
                                        code={conf.code}
                                        country={conf.country}
                                        className="deadlines__flag"
                                    />
                                    {conf.name}
                                </p>
                                {conf.fullName ? (
                                    <p className="deadlines__calendar-detail-note">
                                        {conf.fullName}
                                    </p>
                                ) : null}
                            </div>
                            <div className="deadlines__calendar-detail-meta">
                                <p>{conf.dates}</p>
                                {conf.location ? <p>{conf.location}</p> : null}
                                {conf.officialUrl ? (
                                    <a
                                        className="deadlines__event-link"
                                        href={conf.officialUrl}
                                        target="_blank"
                                        rel="noreferrer">
                                        Conference site{" "}
                                        <span aria-hidden="true">↗</span>
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    ))}

                    {activeEntries.map((entry) => (
                        <div
                            key={`detail-${entry.id}`}
                            className="deadlines__calendar-detail-row">
                            <div className="deadlines__calendar-detail-main">
                                <p className="deadlines__calendar-detail-kind">
                                    {KIND_LABELS[entry.kind] ?? entry.kind}
                                </p>
                                <p className="deadlines__calendar-detail-venue">
                                    <FlagImg
                                        code={entry.code}
                                        country={entry.country}
                                        className="deadlines__flag"
                                    />
                                    {entry.venueName}
                                </p>
                                <p className="deadlines__calendar-detail-note">
                                    {entry.fullLabel}
                                </p>
                            </div>
                            <div className="deadlines__calendar-detail-meta">
                                <p>
                                    {formatDeadlineInDisplayTimezone(
                                        entry.deadlineAt,
                                    )}
                                </p>
                                {entry.timezoneLabel ? (
                                    <p>Official timezone: {entry.timezoneLabel}</p>
                                ) : null}
                                {entry.cfpUrl ? (
                                    <a
                                        className="deadlines__event-link"
                                        href={entry.cfpUrl}
                                        target="_blank"
                                        rel="noreferrer">
                                        Official CFP{" "}
                                        <span aria-hidden="true">↗</span>
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </section>
    );
}
