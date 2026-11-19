#!/usr/bin/env python3
"""Check a .docx against the IJASITELS template rules.

Usage:
    python3 check_ijasitels.py paper_IJASITELS.docx [--pdf]

--pdf also converts the document to PDF with LibreOffice (next to the docx)
and renders PNG previews of every page into <docx>_preview/ so they can be
inspected visually.

Exit code 0 = no errors (warnings may remain), 1 = errors found.
"""
import os
import re
import subprocess
import sys
import zipfile

from lxml import etree

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
WP = "{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}"
M = "{http://schemas.openxmlformats.org/officeDocument/2006/math}"

FRONT_STYLES = ["Title", "Authors", "Affiliation", "line", "Abstract", "Keywords"]


def ptext(p):
    return "".join(t.text or "" for t in p.iter(W + "t"))


def style(p):
    ps = p.find(W + "pPr/" + W + "pStyle")
    return ps.get(W + "val") if ps is not None else "Normal"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    path = args[0]
    z = zipfile.ZipFile(path)
    root = etree.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    paras = list(body.iter(W + "p"))
    top = [el for el in body if el.tag in (W + "p", W + "tbl")]
    errors, warns, ok = [], [], []

    # ---- page setup ----------------------------------------------------------
    sects = root.findall(".//" + W + "sectPr")
    s = sects[-1]
    pg = s.find(W + "pgSz")
    mar = s.find(W + "pgMar")
    if pg is None or pg.get(W + "w") != "11906" or pg.get(W + "h") != "16838":
        errors.append("Page size is not A4 (11906x16838 twips).")
    else:
        ok.append("A4 page")
    if mar is None or [mar.get(W + k) for k in ("top", "bottom", "left", "right")] != ["1701", "1701", "1797", "1797"]:
        errors.append("Margins differ from template (top/bottom 30 mm, left/right 31.7 mm).")
    else:
        ok.append("margins 30/30/31.7/31.7 mm")
    if len(sects) > 1:
        warns.append("Document has %d sections (expected 1)." % len(sects))

    # ---- styles used ---------------------------------------------------------
    styles_xml = z.read("word/styles.xml").decode("utf-8")
    for sid in ("Title", "Authors", "Affiliation", "Abstract", "Keywords", "Heading1", "equation", "figure",
                "Reference", "Acknowledgment", "line"):
        if 'w:styleId="%s"' % sid not in styles_xml:
            errors.append("Template style %s missing from styles.xml (not built from the IJASITELS template?)." % sid)

    # ---- front matter order -----------------------------------------------------
    seq = [style(p) for p in top if p.tag == W + "p"][:12]
    first = [x for x in seq if x in FRONT_STYLES]
    if not seq or seq[0] != "Title":
        errors.append("First paragraph must use style Title.")
    for sname in ("Authors", "Affiliation", "Abstract", "Keywords"):
        if sname not in seq:
            errors.append("Front matter: no paragraph with style %s." % sname)
    title = ptext(top[0]) if top else ""
    if title:
        ok.append("title: %s" % title[:90])
        if len(title.split()) > 25:
            warns.append("Title is long (%d words); template asks for a specific, not broad title." % len(title.split()))

    # authors / ORCID
    au = [p for p in paras if style(p) == "Authors"]
    if au:
        t = ptext(au[0])
        orcids = re.findall(r"\d{4}-\d{4}-\d{4}-\d{3}[\dX]", t)
        ok.append("authors line: %s" % t[:120])
        if not orcids:
            warns.append("No ORCID numbers in the author line ([ORCID number] expected per author).")
        if "ORCID" in t or "XXXX" in t:
            errors.append("Author line still contains placeholders.")
    aff = [ptext(p) for p in paras if style(p) == "Affiliation"]
    if not any("@" in a for a in aff):
        warns.append("No e-mail in the affiliation block (name, affiliation and e-mail are required).")

    # abstract words
    abs_ps = [ptext(p) for p in paras if style(p) == "Abstract"]
    abs_text = " ".join(abs_ps[1:]) if abs_ps and abs_ps[0].strip() == "Abstract" else " ".join(abs_ps)
    n_abs = len(re.findall(r"[A-Za-z0-9][\w'’-]*", abs_text))
    if n_abs == 0:
        errors.append("Abstract is empty.")
    elif n_abs > 300:
        errors.append("Abstract has %d words (max 300)." % n_abs)
    else:
        ok.append("abstract %d words (<= 300)" % n_abs)

    # keywords
    kw = [ptext(p) for p in paras if style(p) == "Keywords"]
    if kw:
        k = re.sub(r"^\s*Keywords\s*:?\s*", "", kw[0])
        kws = [x.strip() for x in re.split(r"[,;]", k) if x.strip()]
        if not 3 <= len(kws) <= 5:
            errors.append("Keywords: %d given, 3-5 required (%s)." % (len(kws), "; ".join(kws)))
        else:
            ok.append("%d keywords" % len(kws))

    # ---- headings --------------------------------------------------------------
    def unnumbered(p):
        n = p.find(W + "pPr/" + W + "numPr/" + W + "numId")
        return n is not None and n.get(W + "val") == "0"
    h1 = [ptext(p) for p in paras if style(p) == "Heading1" and not unnumbered(p)]
    hs = [(style(p), ptext(p)) for p in paras if style(p).startswith("Heading")]
    for st, t in hs:
        if re.match(r"^\s*((\d+\.)*\d+\.?|[IVX]+\.)\s", t):
            errors.append("Heading has a manual number (numbering comes from the style): %r" % t)
    if h1:
        if not re.match(r"(?i)introduction", h1[0].strip()):
            warns.append("First section is %r (template starts with Introduction)." % h1[0])
        if not re.search(r"(?i)conclusion", h1[-1]):
            warns.append("Last numbered section is %r (template ends with Conclusions)." % h1[-1])
        ok.append("sections: " + " | ".join(h1))
    else:
        errors.append("No Heading1 sections.")
    if "Reference" not in [style(p) for p in paras]:
        errors.append("No References heading (style Reference).")

    # ---- figures / alt text --------------------------------------------------------
    docprs = list(root.iter(WP + "docPr"))
    missing_alt = [d.get("name") for d in docprs if not (d.get("descr") or d.get("title"))
                   and d.find(".//{http://schemas.microsoft.com/office/drawing/2017/decorative}decorative") is None]
    if missing_alt:
        errors.append("Images without alt text: %s" % ", ".join(missing_alt))
    elif docprs:
        ok.append("%d images, all with alt text" % len(docprs))
    if list(root.iter(WP + "anchor")):
        warns.append("Floating (anchored) images present; inline images are safer.")

    caps = [ptext(p) for p in paras if style(p) == "figure"]
    fig_caps = [c for c in caps if re.match(r"^Figure \d+", c)]
    tbl_caps = [c for c in caps if re.match(r"^Table \d+", c)]
    n_tbl = len(body.findall(".//" + W + "tbl"))
    if len(fig_caps) < len(docprs):
        warns.append("%d images but %d figure captions." % (len(docprs), len(fig_caps)))
    if n_tbl and len(tbl_caps) < n_tbl:
        warns.append("%d tables but %d table captions (caption must be above the table)." % (n_tbl, len(tbl_caps)))
    # table caption directly above each table
    for i, el in enumerate(top):
        if el.tag == W + "tbl":
            prev = top[i - 1] if i else None
            if prev is None or not re.match(r"^Table \d+", ptext(prev)):
                warns.append("A table is not directly preceded by its 'Table n.' caption.")
                break

    # body text (exclude captions, references)
    body_text = []
    in_refs = False
    ref_entries = []
    for p in paras:
        st = style(p)
        if st == "Reference":
            in_refs = True
            continue
        t = ptext(p)
        if in_refs:
            if t.strip():
                ref_entries.append(t)
        elif st not in ("figure",) + tuple(FRONT_STYLES):
            body_text.append(t)
    text = "\n".join(body_text)

    for t in body_text:
        if re.match(r"^\s*(Fig\.|Figure|Table|Tabel(ul)?)\s*\d+\s*[.:]", t):
            warns.append("Body paragraph looks like a leftover manual caption: %r" % t[:70])
    for c in fig_caps:
        n = re.match(r"^Figure (\d+)", c).group(1)
        if not re.search(r"\bFig(ure|\.)\s*\(?%s\b" % n, text):
            warns.append("Figure %s is never cited in the text (use 'Fig. %s')." % (n, n))
    for c in tbl_caps:
        n = re.match(r"^Table (\d+)", c).group(1)
        if not re.search(r"\bTable\s+%s\b" % n, text):
            warns.append("Table %s is never cited in the text." % n)
    if re.search(r"(?<!^)(?<![.!?]\s)\b(Eq\.|eq\.|Eqn\.)\s*\(?\d", text):
        warns.append("Equations cited as 'Eq. (n)'; IJASITELS wants '(n)' (or 'Equation (n)' at sentence start).")

    # equations
    eqs = [p for p in paras if style(p) == "equation"]
    nums = []
    for p in eqs:
        m = re.search(r"\((\d+)\)\s*$", ptext(p))
        if not m:
            errors.append("Equation paragraph without right-aligned number '(n)'.")
        else:
            nums.append(int(m.group(1)))
        if p.find(".//" + M + "oMath") is None:
            warns.append("Equation paragraph without Word math object.")
    if nums and nums != list(range(1, len(nums) + 1)):
        errors.append("Equations not numbered consecutively: %s" % nums)
    elif nums:
        ok.append("%d numbered equations" % len(nums))

    # references
    if not ref_entries:
        errors.append("Reference list is empty.")
    else:
        rn = []
        for r in ref_entries:
            m = re.match(r"^\[(\d+)\]\s", r)
            if not m:
                errors.append("Reference entry not in '[n] ...' form: %r" % r[:60])
            else:
                rn.append(int(m.group(1)))
        if rn and rn != list(range(1, len(rn) + 1)):
            errors.append("References not numbered consecutively.")
        cited = set()
        for m in re.finditer(r"\[(\d+(?:\s*[-–,]\s*\d+)*)\]", text):
            for part in re.split(r"\s*,\s*", m.group(1)):
                if re.search(r"[-–]", part):
                    a, b = [int(x) for x in re.split(r"\s*[-–]\s*", part)]
                    cited.update(range(a, b + 1))
                else:
                    cited.add(int(part))
        uncited = [n for n in rn if n not in cited]
        missing = sorted(n for n in cited if n not in rn)
        if uncited:
            warns.append("References never cited in text: %s" % uncited)
        if missing:
            errors.append("Citations without a reference entry: %s" % missing)
        if re.search(r"\([A-Z][A-Za-z-]+( et al\.)?,? (19|20)\d\d[a-z]?\)", text):
            warns.append("Author-year citations found; IJASITELS uses numbered [n] citations.")
        ok.append("%d references" % len(ref_entries))

    # ---- formatting hygiene ---------------------------------------------------------
    fonts = set()
    for rf in root.iter(W + "rFonts"):
        for k in ("ascii", "hAnsi"):
            v = rf.get(W + k)
            if v:
                fonts.add(v)
    odd = fonts - {"Times New Roman", "Courier New", "Cambria Math", "Arial", "Symbol"}
    if odd:
        warns.append("Non-template fonts used: %s" % ", ".join(sorted(odd)))
    if root.findall(".//" + W + "u"):
        ul = [u for u in root.iter(W + "u") if u.getparent().getparent().getparent().tag != W + "hyperlink"]
        if ul:
            warns.append("Underlined text present (template: use italics instead).")
    ro = len(re.findall(r"[ăâîșțşţĂÂÎȘȚ]", text))
    if ro > 20:
        warns.append("Text contains %d Romanian diacritics; papers must be in English." % ro)
    for ph in ("TODO", "[ORCID", "XXX-X", "Autor name", "Membership author"):
        if ph in text or any(ph in a for a in aff):
            errors.append("Placeholder text left in document: %r" % ph)

    # ---- report -----------------------------------------------------------------
    print("IJASITELS check: %s\n" % path)
    for o in ok:
        print("  OK    " + o)
    for w in dict.fromkeys(warns):
        print("  WARN  " + w)
    for e in dict.fromkeys(errors):
        print("  ERROR " + e)
    print("\n%d errors, %d warnings" % (len(set(errors)), len(set(warns))))

    if "--pdf" in sys.argv:
        render(path)
    sys.exit(1 if errors else 0)


def render(path):
    outdir = os.path.dirname(os.path.abspath(path))
    r = subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", outdir, path],
                       capture_output=True, text=True)
    pdf = os.path.splitext(os.path.abspath(path))[0] + ".pdf"
    if not os.path.exists(pdf):
        print("PDF conversion failed: " + r.stderr)
        return
    prev = os.path.splitext(os.path.abspath(path))[0] + "_preview"
    os.makedirs(prev, exist_ok=True)
    try:
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(pdf)
        for i in range(len(doc)):
            doc[i].render(scale=1.2).to_pil().save(os.path.join(prev, "page_%02d.png" % (i + 1)))
        print("PDF: %s (%d pages); previews in %s" % (pdf, len(doc), prev))
    except ImportError:
        print("PDF: %s (install pypdfium2 for PNG previews)" % pdf)


if __name__ == "__main__":
    main()
