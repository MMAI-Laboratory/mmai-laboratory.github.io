/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import {
    DEADLINE_DISPLAY_TIMEZONE,
    buildMonthGrid,
    getDeadlineCalendarEntries,
    toDisplayDayKey,
} from "../../utils/deadlineData";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
});

const parseDayKey = (dayKey) => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return { year, monthIndex: month - 1, day };
};

export default function DeadlineCalendar({ venues, now }) {
    const entriesByDay = useMemo(
        () => getDeadlineCalendarEntries(venues),
        [venues],
    );

    // `now` is only filled in on the client, so fall back to render time; the
    // month then follows the real clock once it arrives, unless the visitor has
    // navigated away from it.
    const todayKey = toDisplayDayKey(now ?? new Date());
    const today = parseDayKey(todayKey);
    const [cursor, setCursor] = useState(null);
    const activeCursor = cursor ?? {
        year: today.year,
        monthIndex: today.monthIndex,
    };

    const grid = useMemo(
        () => buildMonthGrid(activeCursor.year, activeCursor.monthIndex),
        [activeCursor.year, activeCursor.monthIndex],
    );

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
        activeCursor.year === today.year &&
        activeCursor.monthIndex === today.monthIndex;

    return (
        <section
            data-reveal
            className="deadlines__calendar page-panel page-panel--compact"
            aria-labelledby="deadlines-calendar-title">
            <div className="deadlines__calendar-head">
                <div>
                    <h2 id="deadlines-calendar-title">Deadline calendar</h2>
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
                        onClick={() => setCursor(null)}
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
                    {grid.map((cell) => {
                        const dayEntries = entriesByDay.get(cell.key) ?? [];
                        const isToday = cell.key === todayKey;

                        return (
                            <div
                                key={cell.key}
                                role="gridcell"
                                className={`deadlines__calendar-cell ${
                                    cell.inMonth ? "" : "is-outside"
                                } ${dayEntries.length ? "has-deadline" : ""}`}>
                                <p
                                    className={`deadlines__calendar-date ${
                                        isToday ? "is-today" : ""
                                    }`}>
                                    {cell.day}
                                </p>
                                {dayEntries.map((entry) => (
                                    <article
                                        key={entry.id}
                                        className={`deadlines__calendar-entry deadlines__calendar-entry--${entry.kind}`}>
                                        <p className="deadlines__calendar-entry-venue">
                                            {entry.venueName}
                                        </p>
                                        <p className="deadlines__calendar-entry-label">
                                            {entry.label}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {monthDeadlineCount === 0 ? (
                <p className="deadlines__calendar-empty">
                    No tracked deadlines fall in {monthLabel}.
                </p>
            ) : null}
        </section>
    );
}
