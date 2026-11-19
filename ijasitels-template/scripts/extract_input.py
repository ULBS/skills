#!/usr/bin/env python3
"""Extract any manuscript (DOCX, DOC, ODT, RTF, PDF, MD, TXT, HTML, TEX) into
Markdown + a media folder, as raw material for the IJASITELS source file.

Usage:
    python3 extract_input.py <input> <workdir>

Writes:
    <workdir>/extracted.md     - Pandoc Markdown of the input (PDF: page text)
    <workdir>/media/...        - images found in the input
    <workdir>/extract_info.txt - what was done + hints (images, equations, tables)
"""
import os
import re
import shutil
import subprocess
import sys


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def via_pandoc(src, workdir, fmt=None):
    media = os.path.join(workdir, "media")
    cmd = ["pandoc", src, "-t", "markdown-simple_tables-multiline_tables-grid_tables+pipe_tables",
           "--wrap=none", "--extract-media=" + workdir, "-o", os.path.join(workdir, "extracted.md")]
    if fmt:
        cmd[1:1] = ["-f", fmt]
    r = run(cmd)
    if r.returncode != 0:
        # retry allowing grid tables (complex tables cannot be pipe tables)
        cmd[3] = "markdown"
        r = run(cmd)
    if r.returncode != 0:
        sys.exit("pandoc failed: " + r.stderr)
    # pandoc extracts to <workdir>/media already
    return media


def convert_with_soffice(src, workdir, target="docx"):
    r = run(["soffice", "--headless", "--convert-to", target, "--outdir", workdir, src])
    out = os.path.join(workdir, os.path.splitext(os.path.basename(src))[0] + "." + target)
    if not os.path.exists(out):
        sys.exit("LibreOffice conversion failed: " + r.stderr)
    return out


def via_pdf(src, workdir):
    import pdfplumber
    media = os.path.join(workdir, "media")
    os.makedirs(media, exist_ok=True)
    lines = []
    n_img = 0
    with pdfplumber.open(src) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            lines.append("\n<!-- page %d -->\n" % pno)
            text = page.extract_text(layout=False) or ""
            lines.append(text)
            for t_i, tbl in enumerate(page.extract_tables() or [], 1):
                if not tbl or not tbl[0]:
                    continue
                lines.append("\n<!-- table candidate p%d #%d (verify against the text above) -->" % (pno, t_i))
                ncol = max(len(r) for r in tbl)
                rows = [[(c or "").replace("\n", " ").replace("|", "\\|") for c in r] + [""] * (ncol - len(r)) for r in tbl]
                lines.append("| " + " | ".join(rows[0]) + " |")
                lines.append("|" + "---|" * ncol)
                for r in rows[1:]:
                    lines.append("| " + " | ".join(r) + " |")
                lines.append("")
            for img in page.images:
                x0, top, x1, bottom = img["x0"], img["top"], img["x1"], img["bottom"]
                if (x1 - x0) < 40 or (bottom - top) < 40:
                    continue  # skip tiny decorations / logos
                n_img += 1
                bbox = (max(0, x0), max(0, top), min(page.width, x1), min(page.height, bottom))
                try:
                    im = page.crop(bbox).to_image(resolution=250)
                    name = "pdf_p%d_img%d.png" % (pno, n_img)
                    im.save(os.path.join(media, name))
                    lines.append("\n![IMAGE p%d #%d](media/%s)\n" % (pno, n_img, name))
                except Exception as e:  # pragma: no cover
                    lines.append("\n<!-- image p%d could not be extracted: %s -->\n" % (pno, e))
            # vector figures are not "images": render each page so they can be cropped manually
            page.to_image(resolution=110).save(os.path.join(media, "page_%03d.png" % pno))
    with open(os.path.join(workdir, "extracted.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return media


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, workdir = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    os.makedirs(workdir, exist_ok=True)
    ext = os.path.splitext(src)[1].lower()
    info = ["input: " + src]
    if ext in (".doc", ".rtf", ".wpd", ".pages"):
        src = convert_with_soffice(src, workdir, "docx")
        info.append("converted with LibreOffice to " + src)
        ext = ".docx"
    if ext == ".pdf":
        via_pdf(src, workdir)
        info.append("PDF text extracted with pdfplumber. Headings, equations, tables, reference list and "
                    "figure captions must be reconstructed by reading the text. Equations come out as broken "
                    "text: rewrite them in LaTeX. Raster images saved as media/pdf_p*_img*.png; vector figures "
                    "are only visible in media/page_NNN.png (crop them with PIL if needed).")
    elif ext in (".md", ".markdown", ".txt"):
        dst = os.path.join(workdir, "extracted.md")
        if os.path.abspath(src) != dst:
            shutil.copy(src, dst)
        # copy local images referenced by the markdown
        txt = open(src, encoding="utf-8", errors="replace").read()
        for m in re.finditer(r"!\[[^\]]*\]\(([^)\s]+)", txt):
            p = os.path.join(os.path.dirname(src), m.group(1))
            if os.path.exists(p):
                d = os.path.join(workdir, m.group(1))
                os.makedirs(os.path.dirname(d), exist_ok=True)
                shutil.copy(p, d)
        info.append("Markdown copied as-is (referenced local images copied next to it).")
    else:
        fmt = {".tex": "latex", ".html": "html", ".htm": "html", ".odt": "odt", ".docx": "docx",
               ".epub": "epub", ".rst": "rst"}.get(ext)
        via_pandoc(src, workdir, fmt)
        info.append("converted with pandoc (%s)" % (fmt or "auto"))
        if ext == ".docx":
            info.append("Note: Word equations become $LaTeX$; check them. Images that are EMF/WMF are kept "
                        "as-is (the builder converts them to PNG via LibreOffice).")
    media = os.path.join(workdir, "media")
    imgs = []
    if os.path.isdir(media):
        for r, _, fs in os.walk(media):
            imgs += [os.path.relpath(os.path.join(r, f), workdir) for f in fs]
    md = open(os.path.join(workdir, "extracted.md"), encoding="utf-8", errors="replace").read()
    info.append("words: %d" % len(re.findall(r"\w+", md)))
    info.append("images: %d" % len(imgs))
    for i in sorted(imgs):
        info.append("  " + i)
    info.append("display equations ($$): %d" % (md.count("$$") // 2))
    with open(os.path.join(workdir, "extract_info.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(info) + "\n")
    print("\n".join(info))
    print("\nOK: %s" % os.path.join(workdir, "extracted.md"))


if __name__ == "__main__":
    main()
