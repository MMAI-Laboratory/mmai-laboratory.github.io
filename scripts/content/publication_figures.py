"""Fetch a representative figure for publications that have none.

Runs in the publication sheet sync (see publications-sheet-sync.yml) and can be
run locally with `npm run publications:figures`. For every published paper in
content/publications/sheet.snapshot.json that has neither a hand-picked figure
(publication_figure_index.js) nor an automatic one yet, it tries, in order:

  1. arXiv HTML: the first figure, when it is a single raster image
  2. arXiv PDF, then the paper's own PDF link: the region above the
     "Figure 1" / "Fig. 1" caption, cropped from the page
  3. Nature / Springer article pages: the first figure image

Only openly reachable sources are used. A source that answers with a login,
paywall or bot check is skipped, never worked around.

Results go to src/assets/images/publications/figures/auto/: <id>.webp and an
index.json entry per paper. Papers without a usable source are recorded as
unavailable together with their links, and are retried only when those links
change. A short report for the pull request body is written to --report.

Requires: pymupdf, pillow (scripts/content/requirements-figures.txt).
"""

import argparse
import hashlib
import io
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_FILE = ROOT / "content/publications/sheet.snapshot.json"
MANUAL_INDEX_FILE = ROOT / "src/assets/images/publications/publication_figure_index.js"
AUTO_DIR = ROOT / "src/assets/images/publications/figures/auto"
AUTO_INDEX_FILE = AUTO_DIR / "index.json"

USER_AGENT = "MMAI-Lab-Publication-Figures/1.0 (+https://mmai-laboratory.github.io)"
TIMEOUT_SECONDS = 30
MAX_PDF_PAGES = 8
MAX_WIDTH = 1600
RENDER_DPI = 300
CAPTION_PATTERN = re.compile(r"^(Figure|Fig\.|FIGURE|FIG\.)\s*1\b")


class SourceUnavailable(Exception):
    """The source cannot be used (missing, blocked, or no figure found)."""


def fetch(url, accept):
    request = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": accept}
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return response.read(), response.headers.get("Content-Type", ""), response.geturl()
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        raise SourceUnavailable(f"{url} ({error})") from error


def fetch_pdf(url):
    body, content_type, _ = fetch(url, "application/pdf")
    if "pdf" not in content_type.lower() and not body.startswith(b"%PDF"):
        # A login page, paywall or bot check instead of the PDF.
        raise SourceUnavailable(f"{url} did not return a PDF")
    return body


def fetch_image(url):
    body, content_type, _ = fetch(url, "image/png,image/jpeg,image/*")
    if not content_type.lower().startswith("image/") or "svg" in content_type.lower():
        raise SourceUnavailable(f"{url} is not a raster image")
    try:
        return Image.open(io.BytesIO(body)).convert("RGB")
    except Exception as error:  # Pillow raises several types for bad data
        raise SourceUnavailable(f"{url} could not be decoded") from error


def arxiv_id(url):
    match = re.search(r"arxiv\.org/(?:abs|pdf|html)/([0-9]{4}\.[0-9]{4,5})", url or "")
    return match.group(1) if match else ""


def caption_text(raw):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", raw))).strip()


# ── Sources ────────────────────────────────────────────────────────────────

def from_arxiv_html(item):
    paper = arxiv_id(item["research_meta"].get("arxiv_link"))
    if not paper:
        raise SourceUnavailable("no arXiv link")
    html_bytes, _, final_url = fetch(f"https://arxiv.org/html/{paper}", "text/html")
    html = html_bytes.decode("utf-8", "replace")
    figure = re.search(r'<figure[^>]*class="[^"]*ltx_figure[^"]*"[^>]*>(.*?)</figure>', html, re.S)
    if not figure:
        raise SourceUnavailable("arXiv HTML has no figure")
    images = re.findall(r'<img[^>]+src="([^"]+)"', figure.group(1))
    # Vector figures (SVG objects) and multi-panel figures are cropped from
    # the PDF instead, which keeps the panels together.
    if len(images) != 1 or not re.search(r"\.(png|jpe?g)$", images[0], re.I):
        raise SourceUnavailable("arXiv HTML figure is not a single raster image")
    caption = re.search(r"<figcaption[^>]*>(.*?)</figcaption>", figure.group(1), re.S)
    image_url = urllib.parse.urljoin(final_url if final_url.endswith("/") else final_url + "/", images[0])
    return fetch_image(image_url), caption_text(caption.group(1)) if caption else "", f"https://arxiv.org/abs/{paper}"


def crop_first_figure(pdf_bytes):
    document = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    for page in list(document)[:MAX_PDF_PAGES]:
        blocks = page.get_text("blocks")
        for block in blocks:
            text = block[4].strip().replace("\n", " ")
            if not CAPTION_PATTERN.match(text):
                continue
            caption = pymupdf.Rect(block[:4])
            full_width = caption.width > page.rect.width * 0.6
            x0 = page.rect.x0 if full_width else caption.x0 - 12
            x1 = page.rect.x1 if full_width else caption.x1 + 12

            # Running headers and page numbers sit in the top band of the page.
            header_bottom = page.rect.y0 + page.rect.height * 0.08

            def in_column(rect):
                return rect.x0 >= x0 - 2 and rect.x1 <= x1 + 2 and rect.y0 >= header_bottom

            # Body text above the figure bounds it from the top.
            text_above = [
                pymupdf.Rect(b[:4]) for b in blocks
                if b[3] <= caption.y0 and len(b[4].strip()) >= 80 and in_column(pymupdf.Rect(b[:4]))
            ]
            top_limit = max((r.y1 for r in text_above), default=page.rect.y0)

            graphics = [pymupdf.Rect(info["bbox"]) for info in page.get_image_info()]
            graphics += [
                drawing["rect"] for drawing in page.get_drawings()
                # Skip page-wide hairlines such as header and footer rules.
                if not (drawing["rect"].height < 1.5 and drawing["rect"].width > page.rect.width * 0.7)
            ]
            graphics = [
                rect for rect in graphics
                if not rect.is_empty and rect.y1 <= caption.y0 + 1 and rect.y0 >= top_limit - 1 and in_column(rect)
            ]
            if not graphics:
                continue
            box = pymupdf.Rect(graphics[0])
            for rect in graphics[1:]:
                box |= rect
            # Labels inside or touching the artwork belong to it; a running
            # header a little further up does not.
            for b in blocks:
                rect = pymupdf.Rect(b[:4])
                if rect.y1 <= caption.y0 and in_column(rect) and len(b[4].strip()) < 80:
                    near = rect.y1 >= box.y0 - 8 and rect.y0 <= box.y1 + 8
                    if near and rect.intersects(pymupdf.Rect(box.x0 - 8, box.y0 - 8, box.x1 + 8, box.y1 + 8)):
                        box |= rect
            if box.width < page.rect.width * 0.25 or box.height < page.rect.height * 0.08:
                continue
            box = (box + (-4, -4, 4, 4)) & page.rect
            # Never reach into the caption itself.
            box.y1 = min(box.y1, caption.y0 - 0.5)
            pixmap = page.get_pixmap(dpi=RENDER_DPI, clip=box)
            image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
            return image, text
    raise SourceUnavailable("no Figure 1 caption with artwork above it")


def from_pdf(url, landing):
    def source():
        image, caption = crop_first_figure(fetch_pdf(url))
        return image, caption, landing or url
    return source


def from_springer_html(item):
    page_url = item["research_meta"].get("project_link") or ""
    if not re.search(r"//(www\.)?(nature\.com|link\.springer\.com)/", page_url):
        raise SourceUnavailable("no Nature/Springer page")
    html = fetch(page_url, "text/html")[0].decode("utf-8", "replace")
    # Article pages also show thumbnails of related articles, so only an
    # image whose path carries this article's own DOI counts.
    article = re.search(r"/articles?/(?:10\.\d+/)?([^/?#]+)", page_url)
    doi_suffix = urllib.parse.quote(article.group(1)) if article else ""
    candidates = re.findall(r'(?:src|data-src)="((?:https:)?//media\.springernature\.com/[^"]*?Fig1_HTML\.(?:png|jpg))"', html)
    own = [url for url in candidates if doi_suffix and doi_suffix in url]
    if not own:
        raise SourceUnavailable("article page lists no Figure 1 image of this article")
    image_url = own[0]
    image_url = re.sub(r"/(lw|m|w)\d+[^/]*/", "/full/", "https:" + image_url if image_url.startswith("//") else image_url)
    return fetch_image(image_url), "Figure 1", page_url


def sources_for(item):
    meta = item["research_meta"]
    sources = [("arXiv HTML", lambda: from_arxiv_html(item))]
    paper = arxiv_id(meta.get("arxiv_link"))
    if paper:
        sources.append(("arXiv PDF", from_pdf(f"https://arxiv.org/pdf/{paper}", f"https://arxiv.org/abs/{paper}")))
    if meta.get("pdf_link"):
        sources.append(("paper PDF", from_pdf(meta["pdf_link"], meta.get("project_link") or meta["pdf_link"])))
    sources.append(("article page", lambda: from_springer_html(item)))
    return sources


# ── Output ─────────────────────────────────────────────────────────────────

def trim_and_resize(image):
    background = Image.new("RGB", image.size, (255, 255, 255))
    bbox = ImageChops.difference(image, background).point(lambda v: 255 if v > 12 else 0).getbbox()
    if bbox:
        left, top, right, bottom = bbox
        pad = 12
        image = image.crop((max(left - pad, 0), max(top - pad, 0), min(right + pad, image.width), min(bottom + pad, image.height)))
    if image.width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(image.height * MAX_WIDTH / image.width)), Image.LANCZOS)
    return image


def links_key(item):
    meta = item["research_meta"]
    raw = "|".join(meta.get(key, "") for key in ("arxiv_link", "pdf_link", "project_link"))
    return hashlib.sha1(raw.encode()).hexdigest()[:12]


def manual_figure_ids():
    text = MANUAL_INDEX_FILE.read_text(encoding="utf-8")
    return set(re.findall(r'^\s{4}"([a-z0-9-]+)": \{', text, re.M))


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--report", help="write a Markdown summary for the pull request here")
    parser.add_argument("--only", nargs="*", help="limit to these publication ids")
    parser.add_argument("--force", action="store_true", help="retry papers marked unavailable")
    parser.add_argument("--out-dir", help="write figures and index here instead (for trying the extraction)")
    parser.add_argument("--include-manual", action="store_true", help="also process papers that have a hand-picked figure")
    args = parser.parse_args()

    global AUTO_DIR, AUTO_INDEX_FILE
    if args.out_dir:
        AUTO_DIR = Path(args.out_dir).resolve()
        AUTO_INDEX_FILE = AUTO_DIR / "index.json"

    items = json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))["items"]
    manual = set() if args.include_manual else manual_figure_ids()
    AUTO_DIR.mkdir(parents=True, exist_ok=True)
    index = json.loads(AUTO_INDEX_FILE.read_text(encoding="utf-8")) if AUTO_INDEX_FILE.exists() else {}

    added, missing = [], []
    for item in items:
        paper_id = item["id"]
        if args.only and paper_id not in args.only:
            continue
        if item.get("status", "published") != "published" or paper_id in manual:
            continue
        entry = index.get(paper_id, {})
        if entry.get("status") == "ok" and (AUTO_DIR / f"{paper_id}.webp").exists():
            continue
        key = links_key(item)
        if entry.get("status") == "unavailable" and entry.get("links_key") == key and not args.force:
            missing.append((item, entry.get("reason", "")))
            continue

        reasons = []
        for name, source in sources_for(item):
            try:
                image, caption, source_url = source()
            except SourceUnavailable as error:
                reasons.append(f"{name}: {error}")
                continue
            image = trim_and_resize(image)
            image.save(AUTO_DIR / f"{paper_id}.webp", "WEBP", quality=88, method=6)
            caption = caption or "Figure 1"
            index[paper_id] = {
                "status": "ok",
                "figureLabel": "Figure 1",
                "alt": f"{caption[:240]}" if caption.lower().startswith(("fig", "figure")) else f"Figure 1 from {item['title']}",
                "sourceUrl": source_url,
                "source": name,
                "links_key": key,
                "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            }
            added.append((item, name, image.size))
            print(f"[figures] {paper_id}: {name} -> {image.size[0]}x{image.size[1]}")
            break
        else:
            reason = "; ".join(reasons) or "no openly available source"
            index[paper_id] = {"status": "unavailable", "reason": reason, "links_key": key,
                               "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
            missing.append((item, reason))
            print(f"[figures] {paper_id}: no figure ({reason})")

    AUTO_INDEX_FILE.write_text(json.dumps(dict(sorted(index.items())), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.report:
        lines = []
        if added:
            lines.append("### 자동으로 가져온 대표 그림")
            lines += [f"- {item['title']} ({source}, {size[0]}×{size[1]})" for item, source, size in added]
            lines.append("\n잘린 영역이 적절한지 Files changed 탭에서 확인해주세요.")
        if missing:
            lines.append("### 대표 그림을 가져오지 못한 논문")
            lines += [f"- {item['title']}" for item, _ in missing]
            lines.append("\n공개된 원문이 없거나 접근이 막힌 경우입니다. 그림은 저장소에 직접 추가해야 합니다.")
        Path(args.report).write_text("\n".join(lines) + "\n" if lines else "", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
