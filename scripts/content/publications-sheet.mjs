// Pulls the mmai_publications tab of the shared publication Google Sheet into
// content/publications/sheet.snapshot.json. Ported from the AAIG site.
//
//   npm run publications:pull              public CSV -> snapshot
//   npm run publications:sheet:bootstrap   generated data -> snapshot + import CSV
//   npm run publications:sheet:check       validate the import CSV
import path from "node:path";
import { promises as fs } from "node:fs";
import {
    PUBLICATIONS_GENERATED_FILE,
    PUBLICATIONS_SHEET_SNAPSHOT_FILE,
    ensureDir,
    normalizeSlug,
    readJsonFile,
    relativeFromRoot,
    writeJsonFile,
} from "./lib.mjs";
import {
    buildPublicationItem,
    getPublicationCategories,
    sortPublicationItems,
} from "./publications.mjs";
import {
    PUBLICATION_SHEET_COLUMNS,
    PUBLICATION_SHEET_REQUIRED_COLUMNS,
    SHEET_FALSE_VALUES,
    SHEET_TRUE_VALUES,
    publicationItemToSheetValues,
    suggestPublicationId,
} from "../../src/utils/publicationSheetRules.js";

const SHEET_IMPORT_FILE = path.resolve(
    "docs/admin/publications-sheet-import.csv",
);

const normalizeCell = (value) => String(value ?? "").trim();

const isRowEnabled = (value, rowNumber) => {
    const normalized = normalizeCell(value).toLowerCase();
    if (!normalized || SHEET_TRUE_VALUES.has(normalized)) return true;
    if (SHEET_FALSE_VALUES.has(normalized)) return false;
    throw new Error(
        `[sheet row ${rowNumber}] "enabled" must be TRUE or FALSE (received "${value}").`,
    );
};

export const parseCsv = (source) => {
    const input = String(source ?? "").replace(/^﻿/, "");
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < input.length; index += 1) {
        const character = input[index];
        const nextCharacter = input[index + 1];

        if (quoted) {
            if (character === '"' && nextCharacter === '"') {
                cell += '"';
                index += 1;
            } else if (character === '"') {
                quoted = false;
            } else {
                cell += character;
            }
            continue;
        }

        if (character === '"') {
            quoted = true;
        } else if (character === ",") {
            row.push(cell);
            cell = "";
        } else if (character === "\n") {
            row.push(cell.replace(/\r$/, ""));
            if (row.some((value) => normalizeCell(value))) rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += character;
        }
    }

    if (quoted) {
        throw new Error("[sheet] CSV contains an unclosed quoted cell.");
    }

    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => normalizeCell(value))) rows.push(row);
    return rows;
};

// The admin editor always writes an id, but a row typed straight into the
// sheet may leave it blank. Such a row keeps the id its title had in the
// previous snapshot, or gets a new one in the usual MMAI format.
const assignRowIds = (entries, previousItems) => {
    const ids = new Map();
    const claimed = [];

    entries.forEach(({ rowNumber, record }) => {
        const explicitId = normalizeCell(record.id);
        if (explicitId) {
            ids.set(rowNumber, explicitId);
            claimed.push({ id: explicitId, category: record.category });
        }
    });

    const claimedIds = () => new Set(claimed.map((item) => item.id));
    const previousByTitle = new Map(
        previousItems.map((item) => [normalizeSlug(item.title), item]),
    );

    entries.forEach(({ rowNumber, record }) => {
        if (ids.has(rowNumber)) return;

        const previous = previousByTitle.get(normalizeSlug(record.title));
        if (previous && !claimedIds().has(previous.id)) {
            ids.set(rowNumber, previous.id);
            claimed.push(previous);
            return;
        }

        const generatedId = suggestPublicationId(record, [
            ...previousItems,
            ...claimed,
        ]);
        ids.set(rowNumber, generatedId);
        claimed.push({ id: generatedId, category: record.category });
        console.log(
            `[sheet row ${rowNumber}] new publication id "${generatedId}". Add it to the id cell to keep it fixed.`,
        );
    });

    return ids;
};

export const normalizeSheetRows = async (csvText, previousItems = []) => {
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
        throw new Error("[sheet] CSV must contain a header and at least one row.");
    }

    const headers = rows[0].map((header) => normalizeCell(header).toLowerCase());
    const duplicateHeaders = headers.filter(
        (header, index) => header && headers.indexOf(header) !== index,
    );
    if (duplicateHeaders.length > 0) {
        throw new Error(
            `[sheet] Duplicate columns: ${Array.from(new Set(duplicateHeaders)).join(", ")}`,
        );
    }

    const missingColumns = PUBLICATION_SHEET_REQUIRED_COLUMNS.filter(
        (column) => !headers.includes(column),
    );
    if (missingColumns.length > 0) {
        throw new Error(
            `[sheet] Missing required columns: ${missingColumns.join(", ")}`,
        );
    }

    const publicationCategories = await getPublicationCategories();
    const entries = rows.slice(1).map((values, rowIndex) => ({
        rowNumber: rowIndex + 2,
        record: Object.fromEntries(
            headers.map((header, columnIndex) => [
                header,
                values[columnIndex] ?? "",
            ]),
        ),
    }));
    const rowIds = assignRowIds(entries, previousItems);

    const items = [];
    const errors = [];
    entries.forEach(({ rowNumber, record }) => {
        try {
            if (!isRowEnabled(record.enabled, rowNumber)) return;
            items.push(
                buildPublicationItem(
                    record,
                    rowIds.get(rowNumber),
                    publicationCategories,
                ),
            );
        } catch (error) {
            const message = error.message || String(error);
            errors.push(
                message.startsWith("[sheet")
                    ? message
                    : `[sheet row ${rowNumber}] ${message}`,
            );
        }
    });

    const seenIds = new Set();
    const seenTitles = new Set();
    items.forEach((item) => {
        if (seenIds.has(item.id)) {
            errors.push(`[sheet] Duplicate id "${item.id}".`);
        }
        seenIds.add(item.id);

        const titleKey = normalizeSlug(item.title);
        if (seenTitles.has(titleKey)) {
            errors.push(`[sheet] Duplicate title "${item.title}".`);
        }
        seenTitles.add(titleKey);
    });

    if (errors.length > 0) {
        throw new Error(
            `[sheet] Publication import failed with ${errors.length} error(s):\n${errors.join("\n")}`,
        );
    }
    if (items.length === 0) {
        throw new Error("[sheet] No enabled publication rows were found.");
    }

    return sortPublicationItems(items);
};

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const writeSheetImportCsv = async (items) => {
    const csv = [
        PUBLICATION_SHEET_COLUMNS,
        ...items.map((item) => {
            const values = publicationItemToSheetValues(item);
            return PUBLICATION_SHEET_COLUMNS.map((column) => values[column]);
        }),
    ]
        .map((row) => row.map(csvCell).join(","))
        .join("\n");
    await ensureDir(path.dirname(SHEET_IMPORT_FILE));
    await fs.writeFile(SHEET_IMPORT_FILE, `${csv}\n`, "utf8");
    console.log(
        `[sheet] wrote ${items.length} rows -> ${relativeFromRoot(SHEET_IMPORT_FILE)}`,
    );
};

const snapshotFor = (items, sourceUrl, syncedAt) => ({
    meta: {
        schema_version: "1.0",
        source: "google-sheets",
        source_url: sourceUrl,
        synced_at: syncedAt,
    },
    items,
});

const readSnapshot = async () => {
    const snapshot = await readJsonFile(PUBLICATIONS_SHEET_SNAPSHOT_FILE, {});
    return {
        meta: snapshot?.meta ?? {},
        items: Array.isArray(snapshot?.items) ? snapshot.items : [],
    };
};

const bootstrap = async () => {
    const generated = await readJsonFile(PUBLICATIONS_GENERATED_FILE, null);
    if (!Array.isArray(generated?.items) || generated.items.length === 0) {
        throw new Error("[sheet] Generated publication data is unavailable.");
    }

    await writeJsonFile(
        PUBLICATIONS_SHEET_SNAPSHOT_FILE,
        snapshotFor(generated.items, "", new Date().toISOString()),
    );
    await writeSheetImportCsv(generated.items);
    console.log(
        `[sheet] bootstrapped snapshot -> ${relativeFromRoot(PUBLICATIONS_SHEET_SNAPSHOT_FILE)}`,
    );
};

const validateCsvFile = async (filePath) => {
    const items = await normalizeSheetRows(
        await fs.readFile(filePath, "utf8"),
        (await readSnapshot()).items,
    );
    console.log(
        `[sheet] validated ${items.length} rows from ${relativeFromRoot(filePath)}`,
    );
};

const assertPublicSheetUrl = (value) => {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error(
            "[sheet] PUBLICATIONS_SHEET_CSV_URL must be a valid HTTPS URL.",
        );
    }

    const allowedHosts = new Set(["docs.google.com", "sheets.googleapis.com"]);
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
        throw new Error(
            "[sheet] PUBLICATIONS_SHEET_CSV_URL must use an official Google Sheets HTTPS host.",
        );
    }
    return url.toString();
};

const pull = async () => {
    const csvUrl = assertPublicSheetUrl(
        process.env.PUBLICATIONS_SHEET_CSV_URL ?? "",
    );
    const response = await fetch(csvUrl, {
        headers: { Accept: "text/csv,text/plain;q=0.9" },
        redirect: "follow",
    });
    if (!response.ok) {
        throw new Error(
            `[sheet] Google Sheet returned ${response.status}. Confirm that it is published for public reading.`,
        );
    }

    const current = await readSnapshot();
    const items = await normalizeSheetRows(
        await response.text(),
        current.items,
    );

    // A wrong tab name or a filtered view can return a fraction of the rows,
    // so a large drop needs an explicit go-ahead from the workflow input.
    const currentCount = current.items.length;
    if (
        currentCount >= 20 &&
        items.length < Math.floor(currentCount * 0.75) &&
        process.env.ALLOW_LARGE_PUBLICATION_DELETION !== "true"
    ) {
        throw new Error(
            `[sheet] Refusing to replace ${currentCount} publications with ${items.length}. Set ALLOW_LARGE_PUBLICATION_DELETION=true only after reviewing the deletion.`,
        );
    }

    const publicSheetUrl = normalizeCell(
        process.env.PUBLICATIONS_SHEET_URL || csvUrl,
    );
    const itemsAreUnchanged =
        JSON.stringify(current.items) === JSON.stringify(items);
    const sourceIsConfigured =
        current.meta.source === "google-sheets" &&
        current.meta.source_url === publicSheetUrl;

    if (itemsAreUnchanged && sourceIsConfigured) {
        console.log(`[sheet] no publication changes (${items.length} rows)`);
        return;
    }

    await writeJsonFile(
        PUBLICATIONS_SHEET_SNAPSHOT_FILE,
        snapshotFor(items, publicSheetUrl, new Date().toISOString()),
    );
    console.log(
        `[sheet] pulled ${items.length} rows -> ${relativeFromRoot(PUBLICATIONS_SHEET_SNAPSHOT_FILE)}`,
    );
};

if (import.meta.url === `file://${process.argv[1]}`) {
    const validateIndex = process.argv.indexOf("--validate");
    const run = process.argv.includes("--bootstrap")
        ? bootstrap
        : validateIndex >= 0
          ? () => validateCsvFile(path.resolve(process.argv[validateIndex + 1]))
          : pull;

    run().catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
}
