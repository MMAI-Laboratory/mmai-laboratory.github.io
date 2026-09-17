import { createHash } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { GENERATED_DIR, ROOT_DIR, writeJsonFile } from "./lib.mjs";

const DEADLINE_CONTENT_FILE = path.resolve(
  ROOT_DIR,
  "content/deadlines/venues.json",
);
const DEADLINE_GENERATED_FILE = path.resolve(
  GENERATED_DIR,
  "deadlines.generated.json",
);
const SOURCE_TIMEOUT_MS = 15_000;
const MONTH_INDEX = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isHttpUrl = (value) => {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const validateDeadline = (deadline, venueId, index) => {
  const prefix = `[deadlines] venues.${venueId}.milestones[${index}]`;

  for (const field of [
    "id",
    "label",
    "short_label",
    "kind",
    "timezone_label",
    "status",
  ]) {
    if (!isNonEmptyString(deadline?.[field])) {
      throw new Error(`${prefix}.${field} must be a non-empty string.`);
    }
  }

  if (!isNonEmptyString(deadline.deadline_at)) {
    throw new Error(`${prefix}.deadline_at must be a non-empty ISO date.`);
  }

  if (Number.isNaN(Date.parse(deadline.deadline_at))) {
    throw new Error(`${prefix}.deadline_at is not a valid date.`);
  }

  if (deadline.source_parser !== undefined) {
    if (
      !deadline.source_parser ||
      !isNonEmptyString(deadline.source_parser.match) ||
      !isNonEmptyString(deadline.source_parser.timezone)
    ) {
      throw new Error(
        `${prefix}.source_parser must contain match and timezone strings.`,
      );
    }

    try {
      new RegExp(deadline.source_parser.match, "i");
    } catch {
      throw new Error(
        `${prefix}.source_parser.match is not a valid regular expression.`,
      );
    }
  }
};

const validateEvent = (event, prefix) => {
  if (event === undefined) {
    return;
  }

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error(`${prefix}.event must be an object when provided.`);
  }

  for (const field of ["dates", "location", "venue", "source_url", "status"]) {
    if (!isNonEmptyString(event[field])) {
      throw new Error(`${prefix}.event.${field} must be a non-empty string.`);
    }
  }

  if (!isHttpUrl(event.source_url)) {
    throw new Error(`${prefix}.event.source_url must be a valid URL.`);
  }
};

export const validateDeadlineContent = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("[deadlines] content must be a JSON object.");
  }

  if (!Array.isArray(data.meta?.area_order) || !data.meta.area_order.length) {
    throw new Error("[deadlines] meta.area_order must be a non-empty array.");
  }

  if (!data.meta?.area_labels || typeof data.meta.area_labels !== "object") {
    throw new Error("[deadlines] meta.area_labels must be an object.");
  }

  const areaSet = new Set(data.meta.area_order);
  if (areaSet.size !== data.meta.area_order.length) {
    throw new Error("[deadlines] meta.area_order contains duplicates.");
  }
  data.meta.area_order.forEach((area) => {
    if (!isNonEmptyString(data.meta.area_labels[area])) {
      throw new Error(`[deadlines] meta.area_labels.${area} is missing.`);
    }
  });

  if (!Array.isArray(data.venues) || !data.venues.length) {
    throw new Error("[deadlines] venues must be a non-empty array.");
  }

  const venueIds = new Set();
  data.venues.forEach((venue, index) => {
    const prefix = `[deadlines] venues[${index}]`;
    for (const field of [
      "id",
      "name",
      "full_name",
      "official_url",
      "cfp_url",
      "status",
    ]) {
      if (!isNonEmptyString(venue?.[field])) {
        throw new Error(`${prefix}.${field} must be a non-empty string.`);
      }
    }

    if (venueIds.has(venue.id)) {
      throw new Error(`${prefix}.id duplicates ${venue.id}.`);
    }
    venueIds.add(venue.id);

    if (!isHttpUrl(venue.official_url) || !isHttpUrl(venue.cfp_url)) {
      throw new Error(`${prefix} must use valid official and CFP URLs.`);
    }

    validateEvent(venue.event, prefix);

    if (
      !Array.isArray(venue.areas) ||
      !venue.areas.length ||
      venue.areas.some((area) => !areaSet.has(area))
    ) {
      throw new Error(`${prefix}.areas must contain known area keys.`);
    }

    if (!Array.isArray(venue.milestones)) {
      throw new Error(`${prefix}.milestones must be an array.`);
    }

    const milestoneIds = new Set();
    venue.milestones.forEach((deadline, milestoneIndex) => {
      validateDeadline(deadline, venue.id, milestoneIndex);
      if (milestoneIds.has(deadline.id)) {
        throw new Error(
          `[deadlines] venues.${venue.id} contains duplicate milestone ${deadline.id}.`,
        );
      }
      milestoneIds.add(deadline.id);
    });

    if (
      venue.status === "verified" &&
      !isNonEmptyString(venue.source_checked_at)
    ) {
      throw new Error(
        `${prefix}.source_checked_at is required for verified data.`,
      );
    }
  });
};

const readDeadlineContent = async () => {
  let raw;
  try {
    raw = await fs.readFile(DEADLINE_CONTENT_FILE, "utf8");
  } catch (error) {
    throw new Error(
      `[deadlines] Cannot read ${path.relative(ROOT_DIR, DEADLINE_CONTENT_FILE)}: ${error.message || error}`,
    );
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `[deadlines] Invalid JSON in ${path.relative(ROOT_DIR, DEADLINE_CONTENT_FILE)}: ${error.message || error}`,
    );
  }
};

const normalizePageText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const getTimezoneOffset = (date, timezone) => {
  if (timezone === "AoE") {
    return "-12:00";
  }

  if (timezone !== "America/Los_Angeles") {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  const offsetMinutes = Math.round((localAsUtc - date.getTime()) / 60_000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
};

const toDeadlineAt = (dateText, timezone) => {
  // Tolerate ordinal suffixes ("February 25th, 2026") alongside the plain
  // "Feb 25 '26" / "February 25, 2026" forms used by other venues.
  const match = dateText
    .trim()
    .replace(/(\d{1,2})(?:st|nd|rd|th)\b/i, "$1")
    .match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:,)?\s+'?(\d{2}|\d{4})$/);
  if (!match) {
    return null;
  }

  const month = MONTH_INDEX[match[1].toLowerCase()];
  const day = String(Number(match[2])).padStart(2, "0");
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  if (!month || Number(day) < 1 || Number(day) > 31) {
    return null;
  }

  const date = new Date(`${year}-${month}-${day}T23:59:00Z`);
  const timezoneOffset = getTimezoneOffset(date, timezone);
  return timezoneOffset
    ? `${year}-${month}-${day}T23:59:00${timezoneOffset}`
    : null;
};

const extractMilestones = (venue, text) => {
  const extracted = {};
  const errors = [];

  venue.milestones.forEach((milestone) => {
    if (!milestone.source_parser) {
      return;
    }

    const matched = new RegExp(milestone.source_parser.match, "i").exec(text);
    const dateText = matched?.[1] ?? "";
    const deadlineAt = toDeadlineAt(dateText, milestone.source_parser.timezone);

    if (!deadlineAt) {
      errors.push(`${milestone.short_label} could not be extracted`);
      return;
    }

    extracted[milestone.id] = deadlineAt;
  });

  return { extracted, errors };
};

const checkOfficialSource = async (venue) => {
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

  try {
    const response = await fetch(venue.cfp_url, {
      headers: {
        "user-agent":
          "MMAI-Lab-Deadline-Monitor/1.0 (+https://mmai-laboratory.github.io)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const html = await response.text();
    const text = normalizePageText(html);
    const evidence = venue.source_evidence?.trim();
    const evidenceFound =
      !evidence || text.toLowerCase().includes(evidence.toLowerCase());
    const { extracted, errors } = extractMilestones(venue, text);
    const hasExtractionFailure = errors.length > 0;
    // A venue with no parsers has nothing to verify, so reporting "matched"
    // would falsely imply its schedule was confirmed against the source.
    const hasParsers = (venue.milestones ?? []).some(
      (milestone) => milestone.source_parser,
    );

    return {
      checked_at: checkedAt,
      state: !hasParsers
        ? "awaiting_cfp"
        : response.ok && evidenceFound && !hasExtractionFailure
          ? "matched"
          : "needs_review",
      http_status: response.status,
      content_fingerprint: createHash("sha256")
        .update(text)
        .digest("hex")
        .slice(0, 16),
      extracted_milestones: extracted,
      message: !hasParsers
        ? "No parser configured yet: the official CFP for the next round is not published."
        : response.ok
          ? !evidenceFound
            ? "Official source changed or no longer contains the configured evidence."
            : hasExtractionFailure
              ? `Official source needs review: ${errors.join(", ")}.`
              : "Official source matched the configured evidence."
          : `Official source returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      checked_at: checkedAt,
      state: "unavailable",
      http_status: null,
      content_fingerprint: null,
      extracted_milestones: {},
      message: `Official source could not be checked: ${error.name === "AbortError" ? "request timed out" : error.message || String(error)}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
};

/* Milestones in venues.json carry this epoch sentinel until a source check
   fills in the real date. Publishing it verbatim would render "Jan 1, 1970"
   on the venue card, so unresolved milestones are dropped instead; a venue
   left with none falls back to its awaiting-CFP presentation. */
const PLACEHOLDER_DEADLINE_PREFIX = "1970-01-01";

const buildGeneratedData = (data, sourceChecks = {}) => ({
  meta: data.meta,
  venues: data.venues.map((venue) => ({
    ...venue,
    milestones: venue.milestones
      .map((milestone) => ({
        ...milestone,
        deadline_at:
          sourceChecks[venue.id]?.state === "matched" &&
          sourceChecks[venue.id]?.extracted_milestones?.[milestone.id]
            ? sourceChecks[venue.id].extracted_milestones[milestone.id]
            : milestone.deadline_at,
      }))
      .filter(
        (milestone) =>
          !String(milestone.deadline_at).startsWith(
            PLACEHOLDER_DEADLINE_PREFIX,
          ),
      )
      .sort(
        (left, right) =>
          new Date(left.deadline_at).getTime() -
          new Date(right.deadline_at).getTime(),
      ),
    source_check: sourceChecks[venue.id] ?? null,
  })),
});

export const syncDeadlineContent = async ({
  validateOnly = false,
  refreshSources = false,
} = {}) => {
  const data = await readDeadlineContent();
  validateDeadlineContent(data);

  const sourceChecks = {};
  if (refreshSources) {
    const results = await Promise.all(
      data.venues.map(async (venue) => [
        venue.id,
        await checkOfficialSource(venue),
      ]),
    );
    results.forEach(([id, check]) => {
      sourceChecks[id] = check;
    });
  }

  const generated = buildGeneratedData(data, sourceChecks);
  if (!validateOnly) {
    await writeJsonFile(DEADLINE_GENERATED_FILE, generated);
  }

  return generated;
};

const isExecutedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname);

if (isExecutedDirectly) {
  const refreshSources = process.argv.includes("--refresh-sources");
  const validateOnly = process.argv.includes("--validate-only");

  syncDeadlineContent({ validateOnly, refreshSources })
    .then((data) => {
      console.log(
        `[deadlines] ${validateOnly ? "validation" : refreshSources ? "source refresh" : "sync"} completed for ${data.venues.length} venues.`,
      );
    })
    .catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
}
