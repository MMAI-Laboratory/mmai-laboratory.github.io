import DEADLINE_DATA from "../generated/deadlines.generated.json";

const FALLBACK_AREA_LABEL = "Other";

export const DEADLINE_AREAS = (DEADLINE_DATA.meta?.area_order ?? []).map(
  (key) => ({
    key,
    label: DEADLINE_DATA.meta?.area_labels?.[key] ?? FALLBACK_AREA_LABEL,
  }),
);

export const DEADLINE_DISPLAY_TIMEZONE =
  DEADLINE_DATA.meta?.display_timezone ?? "Asia/Seoul";

export const DEADLINE_STATUS_META = {
  verified: { label: "Official CFP verified", tone: "verified" },
  awaiting_cfp: { label: "Awaiting current CFP", tone: "awaiting" },
  needs_review: { label: "Source needs review", tone: "review" },
  estimated: { label: "Estimated", tone: "estimated" },
};

const asDate = (value) => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

export const getVenueStatusMeta = (status) =>
  DEADLINE_STATUS_META[status] ?? {
    label: "Source status unavailable",
    tone: "awaiting",
  };

const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/g;

// Venue names in the dataset are inconsistent: some carry the edition year
// ("ICLR 2027"), most do not ("AAAI"). Derive the missing year from the event
// dates so every card reads "<name> <year>", and leave names that already
// state a year untouched — those are authored deliberately.
export const getVenueDisplayName = (venue) => {
  const name = String(venue?.name ?? "").trim();
  if (!name || YEAR_PATTERN.test(name)) {
    YEAR_PATTERN.lastIndex = 0;
    return name;
  }
  YEAR_PATTERN.lastIndex = 0;

  const years = String(venue?.event?.dates ?? "").match(YEAR_PATTERN);
  YEAR_PATTERN.lastIndex = 0;
  return years?.length ? `${name} ${years[years.length - 1]}` : name;
};

export const getAllVenues = () =>
  [...(DEADLINE_DATA.venues ?? [])]
    .map((venue) => ({
      ...venue,
      name: getVenueDisplayName(venue),
      milestones: [...(venue.milestones ?? [])].sort(
        (left, right) =>
          Date.parse(left.deadline_at) - Date.parse(right.deadline_at),
      ),
    }))
    .sort((left, right) => {
      const leftHasMilestones = left.milestones.length > 0;
      const rightHasMilestones = right.milestones.length > 0;
      if (leftHasMilestones !== rightHasMilestones) {
        return leftHasMilestones ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

export const getDefaultMilestoneId = (venue, now = new Date()) => {
  const nextMilestone = venue.milestones?.find((milestone) => {
    const deadline = asDate(milestone.deadline_at);
    return deadline && deadline > now;
  });

  return nextMilestone?.id ?? venue.milestones?.[0]?.id ?? null;
};

export const formatDeadlineInDisplayTimezone = (deadlineAt) => {
  const date = asDate(deadlineAt);
  if (!date) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DEADLINE_DISPLAY_TIMEZONE,
  }).format(date);
};

export const formatSourceCheckedAt = (checkedAt) => {
  const date = asDate(checkedAt);
  if (!date) {
    return "Not checked yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: DEADLINE_DISPLAY_TIMEZONE,
  }).format(date);
};

export const getCountdownLabel = (deadlineAt, now) => {
  const deadline = asDate(deadlineAt);
  if (!deadline || !now) {
    return "Calculating…";
  }

  const remainingMs = deadline.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return "Closed";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
};

// ── Calendar helpers ────────────────────────────────────────────────────────
// Deadlines carry their own offsets (often AoE), so bucket them by the calendar
// day they land on in the display timezone rather than the viewer's local one.
const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEADLINE_DISPLAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const toDisplayDayKey = (value) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return DAY_KEY_FORMATTER.format(parsed);
};

export const getDeadlineCalendarEntries = (venues = getAllVenues()) => {
  const byDay = new Map();

  venues.forEach((venue) => {
    (venue.milestones ?? []).forEach((milestone) => {
      const dayKey = toDisplayDayKey(milestone.deadline_at);
      if (!dayKey) {
        return;
      }
      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, []);
      }
      byDay.get(dayKey).push({
        id: `${venue.id}-${milestone.id}`,
        venueId: venue.id,
        venueName: venue.name,
        label: milestone.short_label || milestone.label,
        kind: milestone.kind,
        deadlineAt: milestone.deadline_at,
      });
    });
  });

  byDay.forEach((entries) =>
    entries.sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt)),
  );

  return byDay;
};

// Sunday-start grid sized to the weeks the month actually spans, so a month
// that fits in five rows does not render a trailing week of next month.
export const buildMonthGrid = (year, monthIndex) => {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const leadingBlanks = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;

  const start = new Date(firstOfMonth);
  start.setUTCDate(1 - leadingBlanks);

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const pad = (value) => String(value).padStart(2, "0");

    return {
      key: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
    };
  });
};

/* Country names as they appear at the end of a venue location string, mapped
   to ISO 3166-1 alpha-2 codes. Locations are authored in content, so this is
   a small closed set rather than a general geocoder. */
const COUNTRY_CODES = {
  australia: "AU",
  canada: "CA",
  china: "CN",
  france: "FR",
  cyprus: "CY",
  greece: "GR",
  "hong kong": "HK",
  hungary: "HU",
  italy: "IT",
  japan: "JP",
  morocco: "MA",
  netherlands: "NL",
  "new zealand": "NZ",
  vietnam: "VN",
  "south korea": "KR",
  sweden: "SE",
  "united kingdom": "GB",
  usa: "US",
};

const toFlagEmoji = (countryCode) =>
  String.fromCodePoint(
    ...[...countryCode].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );

/* Splits a location into its display segments, each carrying the flag for the
   country it ends with. Multi-site events separate sites with ";", so each
   site keeps its own flag. Segments whose country is unknown render as plain
   text rather than guessing. */
export const getLocationSegments = (location) => {
  if (!location) {
    return [];
  }

  return location
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const country = segment.split(",").pop().trim().toLowerCase();
      const code = COUNTRY_CODES[country];

      return {
        text: segment,
        country: code ? segment.split(",").pop().trim() : null,
        flag: code ? toFlagEmoji(code) : null,
      };
    });
};
