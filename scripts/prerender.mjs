import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SSG_ROUTE_PATHS } from "../src/routes/routeDefinitions.js";

const ROOT_DIR = process.cwd();
const DIST_DIR = path.resolve(ROOT_DIR, "dist");
const SERVER_DIR = path.resolve(DIST_DIR, "server");
const SERVER_ENTRY = path.resolve(SERVER_DIR, "entry-server.js");
const ROOT_HTML_FILE = path.resolve(DIST_DIR, "index.html");

const ROOT_CONTAINER_PATTERN = /<div id="root">[\s\S]*?<\/div>/;

// Sitemaps require absolute URLs, so the deployed origin must be known at
// build time. Override with SITE_ORIGIN for a preview or a custom domain.
const SITE_ORIGIN = (
  process.env.SITE_ORIGIN || "https://mmai-laboratory.github.io"
).replace(/\/+$/, "");

const SITEMAP_FILE = path.resolve(DIST_DIR, "sitemap.xml");

const writeSitemap = async (routePaths) => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = routePaths
    .map((routePath) =>
      [
        "  <url>",
        `    <loc>${SITE_ORIGIN}${routePath}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <priority>${routePath === "/" ? "1.0" : "0.8"}</priority>`,
        "  </url>",
      ].join("\n"),
    )
    .join("\n");

  await writeFile(
    SITEMAP_FILE,
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      "</urlset>",
      "",
    ].join("\n"),
    "utf-8",
  );
};

const toOutputFile = (routePath) => {
  if (routePath === "/") {
    return ROOT_HTML_FILE;
  }

  const routeDir = routePath.replace(/^\/+/, "");
  return path.resolve(DIST_DIR, routeDir, "index.html");
};

async function prerender() {
  const template = await readFile(ROOT_HTML_FILE, "utf-8");
  if (!ROOT_CONTAINER_PATTERN.test(template)) {
    throw new Error("Unable to find #root mount point in dist/index.html");
  }

  const serverModule = await import(pathToFileURL(SERVER_ENTRY).href);
  if (typeof serverModule.render !== "function") {
    throw new Error("entry-server.js must export a render(url) function");
  }

  const renderedRoutes = [];

  for (const routePath of SSG_ROUTE_PATHS) {
    const appHtml = serverModule.render(routePath);
    const html = template.replace(ROOT_CONTAINER_PATTERN, `<div id="root">${appHtml}</div>`);
    const outputFile = toOutputFile(routePath);

    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, html, "utf-8");
    renderedRoutes.push(routePath);
  }

  await rm(SERVER_DIR, { recursive: true, force: true });
  await writeSitemap(renderedRoutes);
  console.log(`Prerendered ${renderedRoutes.length} routes: ${renderedRoutes.join(", ")}`);
  console.log(`Wrote sitemap.xml with ${renderedRoutes.length} URLs (${SITE_ORIGIN})`);
}

prerender().catch((error) => {
  console.error(error);
  process.exit(1);
});
