/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  DEADLINE_AREAS,
  DEADLINE_DISPLAY_TIMEZONE,
  formatDeadlineInDisplayTimezone,
  formatSourceCheckedAt,
  getAllVenues,
  getCountdownLabel,
  getDefaultMilestoneId,
  getLocationSegments,
  getVenueStatusMeta,
} from "../../utils/deadlineData";
import DeadlineCalendar from "./Deadlines.Calendar";
import "./Deadlines.css";

const ALL_AREAS = "all";

const getSelectedMilestone = (venue, selectedMilestones, now) => {
  const selectedId =
    selectedMilestones[venue.id] ?? getDefaultMilestoneId(venue, now);
  return (
    venue.milestones.find((milestone) => milestone.id === selectedId) ?? null
  );
};

function DeadlineCard({ venue, selectedMilestones, onSelectMilestone, now }) {
  const selectedMilestone = getSelectedMilestone(
    venue,
    selectedMilestones,
    now,
  );
  const statusMeta = getVenueStatusMeta(venue.status);
  const sourceCheck = venue.source_check;
  const event = venue.event;

  return (
    <article
      id={`venue-${venue.id}`}
      data-reveal
      className="deadlines__venue page-panel page-panel--compact"
    >
      <div className="deadlines__venue-head">
        <div className="deadlines__venue-identity">
          <div className="deadlines__badges">
            {venue.areas.map((area) => {
              const areaMeta = DEADLINE_AREAS.find((item) => item.key === area);
              return (
                <span
                  key={area}
                  className="deadlines__badge deadlines__badge--area"
                >
                  {areaMeta?.label ?? area}
                </span>
              );
            })}
            <span
              className={`deadlines__badge deadlines__badge--${statusMeta.tone}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <h2>{venue.name}</h2>
          <p>{venue.full_name}</p>
        </div>
        <a
          className="deadlines__official-link btn btn--secondary btn--sm interactive-button"
          href={venue.cfp_url}
          target="_blank"
          rel="noreferrer"
        >
          Official CFP <span aria-hidden="true">↗</span>
        </a>
      </div>

      {event ? (
        <dl
          className="deadlines__event"
          aria-label={`${venue.name} event details`}
        >
          <div className="deadlines__event-item">
            <dt>Event dates</dt>
            <dd>{event.dates}</dd>
          </div>
          <div className="deadlines__event-item">
            <dt>Location</dt>
            <dd className="deadlines__location">
              {getLocationSegments(event.location).map(
                (segment, index, segments) => (
                  <span key={segment.text} className="deadlines__location-site">
                    {segment.flag ? (
                      <span
                        className="deadlines__flag"
                        role="img"
                        aria-label={segment.country}
                      >
                        {segment.flag}
                      </span>
                    ) : null}
                    {index < segments.length - 1
                      ? `${segment.text};`
                      : segment.text}
                  </span>
                ),
              )}
            </dd>
          </div>
          <div className="deadlines__event-item">
            <dt>Venue</dt>
            <dd>{event.venue}</dd>
          </div>
          <div className="deadlines__event-item deadlines__event-item--source">
            <dt>Source</dt>
            <dd>
              <a
                className="deadlines__event-link"
                href={event.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Official event info <span aria-hidden="true">↗</span>
              </a>
            </dd>
          </div>
        </dl>
      ) : null}

      {venue.milestones.length > 0 && selectedMilestone ? (
        <div className="deadlines__schedule">
          <div
            className="deadlines__milestone-tabs"
            role="group"
            aria-label={`${venue.name} deadline stages`}
          >
            {venue.milestones.map((milestone) => {
              const isSelected = milestone.id === selectedMilestone.id;
              return (
                <button
                  key={milestone.id}
                  type="button"
                  className={`deadlines__milestone-btn btn btn--secondary btn--sm interactive-button ${isSelected ? "is-active" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelectMilestone(venue.id, milestone.id)}
                >
                  {milestone.short_label}
                </button>
              );
            })}
          </div>
          <div className="deadlines__milestone-detail" aria-live="polite">
            <div>
              <p className="deadlines__milestone-label">
                {selectedMilestone.label}
              </p>
              <p className="deadlines__date">
                {formatDeadlineInDisplayTimezone(selectedMilestone.deadline_at)}{" "}
                KST
              </p>
              <p className="deadlines__timezone-note">
                Official deadline timezone: {selectedMilestone.timezone_label}
              </p>
            </div>
            <p
              className="deadlines__countdown"
              aria-label={`Time remaining: ${getCountdownLabel(selectedMilestone.deadline_at, now)}`}
            >
              {getCountdownLabel(selectedMilestone.deadline_at, now)}
            </p>
          </div>
        </div>
      ) : (
        <div className="deadlines__empty-schedule">
          <p>
            Track-specific deadlines have not been published in the current
            official CFP.
          </p>
        </div>
      )}

      <div className="deadlines__source-meta">
        <span>
          {venue.source_checked_at
            ? `Verified ${formatSourceCheckedAt(venue.source_checked_at)}`
            : "Official CFP will be monitored when the current cycle opens."}
        </span>
        {sourceCheck && sourceCheck.state !== "matched" ? (
          <span>{sourceCheck.message}</span>
        ) : null}
      </div>
    </article>
  );
}

function Deadlines() {
  const [selectedArea] = useState(ALL_AREAS);
  const [searchQuery] = useState("");
  const [selectedMilestones, setSelectedMilestones] = useState({});
  const [now, setNow] = useState(null);
  const venues = useMemo(() => getAllVenues(), []);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const intervalId = window.setInterval(tick, 1_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredVenues = useMemo(
    () =>
      venues.filter((venue) => {
        const matchesArea =
          selectedArea === ALL_AREAS || venue.areas.includes(selectedArea);
        const matchesQuery =
          !normalizedQuery ||
          venue.name?.toLowerCase().includes(normalizedQuery) ||
          venue.full_name?.toLowerCase().includes(normalizedQuery);
        return matchesArea && matchesQuery;
      }),
    [selectedArea, normalizedQuery, venues],
  );

  const handleSelectVenue = (venueId) => {
    if (typeof document === "undefined") {
      return;
    }
    const target = document.getElementById(`venue-${venueId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectMilestone = (venueId, milestoneId) => {
    setSelectedMilestones((current) => ({
      ...current,
      [venueId]: milestoneId,
    }));
  };

  return (
    <div data-reveal data-reveal-load-delay="60" className="deadlines">
      {/* Browse venues — temporarily hidden.
      <section
        data-reveal
        className="deadlines__controls page-panel page-panel--compact page-panel--section-start page-controls"
        aria-labelledby="deadlines-controls-title"
      >
        <div className="deadlines__controls-intro page-controls__intro">
          <h2 id="deadlines-controls-title">Browse venues</h2>
        </div>
        <div className="deadlines__search-wrap">
          <label
            className="deadlines__search-label page-controls__label"
            htmlFor="deadlines-search"
          >
            Search conferences
          </label>
          <input
            id="deadlines-search"
            type="search"
            className="deadlines__search-input"
            placeholder="Search by conference name (e.g. CVPR, NeurIPS)"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </section>
      */}

      <DeadlineCalendar
        venues={filteredVenues}
        now={now}
        onSelectVenue={handleSelectVenue}
      />

      <section
        className="deadlines__list"
        aria-labelledby="deadlines-list-title"
      >
        <div className="deadlines__list-head">
          <div>
            <h2 id="deadlines-list-title">Conference schedule</h2>
            <p>
              {filteredVenues.length} venues · Times displayed in{" "}
              {DEADLINE_DISPLAY_TIMEZONE}
            </p>
          </div>
        </div>
        {filteredVenues.map((venue) => (
          <DeadlineCard
            key={venue.id}
            venue={venue}
            selectedMilestones={selectedMilestones}
            onSelectMilestone={handleSelectMilestone}
            now={now}
          />
        ))}
      </section>
    </div>
  );
}

export default Deadlines;
