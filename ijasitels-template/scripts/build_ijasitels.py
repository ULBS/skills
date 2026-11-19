#!/usr/bin/env python3
"""Build an IJASITELS-formatted .docx from an IJASITELS source Markdown file.

The output is generated *inside* the official IJASITELS Word template
(assets/template_IJASITELS.docx): its styles, heading numbering, theme,
page setup, headers and footers are reused verbatim; only the body,
relationships, numbering (lists), media and document properties change.

Usage:
    python3 build_ijasitels.py paper.ijasitels.md -o paper_IJASITELS.docx
           [--template path/to/template.docx] [--table-font-size 10]

Source format (see SKILL.md / references/source-format.md): YAML front
matter (title, authors, affiliations, abstract, keywords, acknowledgment,
references, journal) followed by a Pandoc-Markdown body.
"""
import argparse
import copy
import datetime as _dt
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from xml.sax.saxutils import escape as _esc

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required: pip install pyyaml")
try:
    from PIL import Image as PILImage
except ImportError:  # pragma: no cover
    PILImage = None
from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TEMPLATE = os.path.join(HERE, "..", "assets", "template_IJASITELS.docx")

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
M_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
REL_LINK = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"

# Page geometry from the template: A4, left/right 1797 twips (31.7 mm).
TEXT_WIDTH_TW = 11906 - 2 * 1797          # 8312 twips = 146.6 mm
EMU_PER_TW = 635
MAX_IMG_W_EMU = TEXT_WIDTH_TW * EMU_PER_TW
MAX_IMG_H_EMU = int(20 * 360000)           # 20 cm

WARNINGS = []
RPR_ORDER = ["rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline",
             "shadow", "emboss", "imprint", "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing",
             "w", "kern", "position", "sz", "szCs", "highlight", "u", "effect", "bdr", "shd", "fitText",
             "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout", "specVanish", "oMath"]


def warn(msg):
    WARNINGS.append(msg)


def shrink_png(data, w_emu, max_dpi=300, max_colors=4096):
    """Keep uploads small (journal OJS rejects large files with 'HTTP Error'):
    downscale above max_dpi at the printed width; charts/diagrams (few colours)
    become 256-colour palette PNGs (visually lossless). Photos keep full colour."""
    if not PILImage:
        return data
    try:
        im = PILImage.open(io.BytesIO(data))
        im.load()
        max_px = int(w_emu / 914400.0 * max_dpi)
        if max_px > 0 and im.width > max_px:
            im = im.resize((max_px, int(im.height * max_px / im.width)), PILImage.LANCZOS)
        if im.mode not in ("RGB", "RGBA", "P", "L"):
            im = im.convert("RGBA")
        if im.mode in ("RGB", "RGBA") and im.getcolors(max_colors) is not None:
            im = im.quantize(256, method=PILImage.Quantize.FASTOCTREE)
        buf = io.BytesIO()
        im.save(buf, "PNG", optimize=True)
        out = buf.getvalue()
        return out if len(out) < len(data) else data
    except Exception:
        return data


def esc(text):
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    return _esc(text, {'"': "&quot;"})


# --------------------------------------------------------------------------
# Pandoc helpers
# --------------------------------------------------------------------------

def pandoc_json(markdown_text, extra_from=""):
    fmt = "markdown" + extra_from
    out = subprocess.run(["pandoc", "-f", fmt, "-t", "json"], input=markdown_text.encode("utf-8"),
                         capture_output=True, check=True)
    return json.loads(out.stdout.decode("utf-8"))


def inline_text(inlines):
    """Plain text of a list of pandoc inlines."""
    out = []
    for il in inlines or []:
        t = il.get("t")
        c = il.get("c")
        if t == "Str":
            out.append(c)
        elif t in ("Space", "SoftBreak", "LineBreak"):
            out.append(" ")
        elif t in ("Emph", "Strong", "Underline", "Strikeout", "Superscript", "Subscript", "SmallCaps"):
            out.append(inline_text(c))
        elif t == "Quoted":
            q = "“%s”" if c[0]["t"] == "DoubleQuote" else "‘%s’"
            out.append(q % inline_text(c[1]))
        elif t == "Code":
            out.append(c[1])
        elif t == "Math":
            out.append(c[1])
        elif t in ("Link", "Image", "Span"):
            out.append(inline_text(c[1]))
        elif t == "Cite":
            out.append(inline_text(c[1]))
        elif t == "Note":
            pass
    return "".join(out)


def blocks_text(blocks):
    parts = []
    for b in blocks or []:
        if b["t"] in ("Para", "Plain"):
            parts.append(inline_text(b["c"]))
        elif b["t"] in ("BulletList", "OrderedList"):
            items = b["c"] if b["t"] == "BulletList" else b["c"][1]
            for it in items:
                parts.append(blocks_text(it))
        elif b["t"] in ("Div", "BlockQuote"):
            parts.append(blocks_text(b["c"][1] if b["t"] == "Div" else b["c"]))
    return "\n".join(p for p in parts if p)


# --------------------------------------------------------------------------
# Math: TeX -> OMML via pandoc (one batch call)
# --------------------------------------------------------------------------

class MathStore:
    def __init__(self):
        self.items = []      # (display:bool, tex)
        self.omml = []

    def add(self, display, tex):
        self.items.append((display, tex))
        return len(self.items) - 1

    def convert(self, api_version):
        if not self.items:
            return
        blocks = []
        for display, tex in self.items:
            mt = "DisplayMath" if display else "InlineMath"
            blocks.append({"t": "Para", "c": [{"t": "Math", "c": [{"t": mt}, tex]}]})
        doc = {"pandoc-api-version": api_version, "meta": {}, "blocks": blocks}
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "m.docx")
            subprocess.run(["pandoc", "-f", "json", "-o", out], input=json.dumps(doc).encode(),
                           check=True, capture_output=True)
            with zipfile.ZipFile(out) as z:
                root = etree.fromstring(z.read("word/document.xml"))
        paras = root.findall(".//{%s}body/{%s}p" % (W_NS, W_NS))
        for i, p in enumerate(paras[: len(self.items)]):
            om = p.find(".//{%s}oMath" % M_NS)
            if om is None:
                warn("Could not convert equation to Word math: %r" % self.items[i][1])
                self.omml.append(None)
                continue
            self.omml.append(etree.tostring(om, encoding="unicode"))
        while len(self.omml) < len(self.items):
            self.omml.append(None)


# --------------------------------------------------------------------------
# Builder
# --------------------------------------------------------------------------

class Builder:
    def __init__(self, src_dir, table_font_size=None):
        self.src_dir = src_dir
        self.table_font_size = table_font_size
        self.rels = []            # (rId, type, target, external)
        self.media = []           # (zip name, bytes)
        self.next_rid = 100
        self.next_docpr = 1
        self.math = MathStore()
        self.fig_no = 0
        self.tbl_no = 0
        self.eq_no = 0
        self.labels = {}          # fig:x / tbl:x / eq:x -> number
        self.ref_ids = {}         # citation key -> index in ref list (unordered)
        self.ref_order = []       # keys in order of first citation
        self.ordered_lists = []   # numIds needing restart overrides
        self.next_num_id = 100
        self.tmpdir = tempfile.mkdtemp(prefix="ijasitels_")

    # ---- relationships -----------------------------------------------------
    def add_rel(self, rtype, target, external=False):
        rid = "rIdX%d" % self.next_rid
        self.next_rid += 1
        self.rels.append((rid, rtype, target, external))
        return rid

    # ---- runs --------------------------------------------------------------
    @staticmethod
    def rpr(fmt, base=""):
        """fmt: set of b,i,u,s,sup,sub,code,sc ; base: extra raw rPr xml (size etc)."""
        parts = []
        if "code" in fmt:
            parts.append('<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>')
        if "b" in fmt:
            parts.append("<w:b/><w:bCs/>")
        if "i" in fmt:
            parts.append("<w:i/><w:iCs/>")
        if "sc" in fmt:
            parts.append("<w:smallCaps/>")
        if "s" in fmt:
            parts.append("<w:strike/>")
        if "link" in fmt:
            parts.append('<w:color w:val="0563C1"/>')
        parts.append(base)
        if "code" in fmt and "<w:sz " not in base:
            parts.append('<w:sz w:val="20"/><w:szCs w:val="20"/>')
        if "u" in fmt or "link" in fmt:
            parts.append('<w:u w:val="single"/>')
        if "sup" in fmt:
            parts.append('<w:vertAlign w:val="superscript"/>')
        elif "sub" in fmt:
            parts.append('<w:vertAlign w:val="subscript"/>')
        inner = "".join(parts)
        if not inner:
            return ""
        # Word requires rPr children in schema order
        els = re.findall(r"<w:(\w+)\b[^>]*/>", inner)
        chunks = re.findall(r"<w:\w+\b[^>]*/>", inner)
        seen, ordered = set(), []
        for name, chunk in sorted(zip(els, chunks), key=lambda x: RPR_ORDER.index(x[0]) if x[0] in RPR_ORDER else 99):
            if name not in seen:
                seen.add(name)
                ordered.append(chunk)
        return "<w:rPr>%s</w:rPr>" % "".join(ordered)

    def run(self, text, fmt=frozenset(), base=""):
        if text == "":
            return ""
        return '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (self.rpr(fmt, base), esc(text))

    # ---- inlines -----------------------------------------------------------
    def inlines(self, ils, fmt=frozenset(), base=""):
        out = []
        for il in ils or []:
            t = il.get("t")
            c = il.get("c")
            if t == "Str":
                out.append(self.run(c, fmt, base))
            elif t in ("Space", "SoftBreak"):
                out.append(self.run(" ", fmt, base))
            elif t == "LineBreak":
                out.append("<w:r><w:br/></w:r>")
            elif t == "Emph":
                out.append(self.inlines(c, fmt | {"i"}, base))
            elif t == "Strong":
                out.append(self.inlines(c, fmt | {"b"}, base))
            elif t == "Underline":
                if "link" in fmt:   # underline on a hyperlink is just link styling
                    out.append(self.inlines(c, fmt, base))
                else:
                    # IJASITELS: use italics instead of underline
                    warn("Underlined text converted to italics (IJASITELS uses italics, not underline).")
                    out.append(self.inlines(c, fmt | {"i"}, base))
            elif t == "Strikeout":
                out.append(self.inlines(c, fmt | {"s"}, base))
            elif t == "Superscript":
                out.append(self.inlines(c, fmt | {"sup"}, base))
            elif t == "Subscript":
                out.append(self.inlines(c, fmt | {"sub"}, base))
            elif t == "SmallCaps":
                out.append(self.inlines(c, fmt | {"sc"}, base))
            elif t == "Quoted":
                o, cl = ("“", "”") if c[0]["t"] == "DoubleQuote" else ("‘", "’")
                out.append(self.run(o, fmt, base) + self.inlines(c[1], fmt, base) + self.run(cl, fmt, base))
            elif t == "Code":
                out.append(self.run(c[1], fmt | {"code"}, base))
            elif t == "Math":
                if c[0]["t"] == "DisplayMath":
                    # display math inside a mixed paragraph is split out by para(); fallback inline
                    pass
                idx = self.math.add(False, c[1])
                out.append("\x00MATH%d\x00" % idx)
            elif t == "Link":
                url = c[2][0]
                if url.startswith("#"):
                    out.append(self.inlines(c[1], fmt, base))
                else:
                    rid = self.add_rel(REL_LINK, url, external=True)
                    out.append('<w:hyperlink r:id="%s" w:history="1">%s</w:hyperlink>'
                               % (rid, self.inlines(c[1], fmt | {"link"}, base)))
            elif t == "Span":
                out.append(self.inlines(c[1], fmt, base))
            elif t == "Cite":
                out.append(self.cite(c, fmt, base))
            elif t == "Note":
                txt = blocks_text(c)
                warn("Footnote converted to parenthetical text: %r" % txt[:80])
                out.append(self.run(" (" + txt + ")", fmt, base))
            elif t == "Image":
                drawing = self.image_run(c, inline_alt=inline_text(c[1]))
                out.append(drawing or "")
            elif t == "RawInline":
                if c[0] == "openxml":
                    out.append(c[1])
            else:
                warn("Unsupported inline element %s skipped" % t)
        return "".join(out)

    def cite(self, c, fmt, base):
        cits = c[0]
        keys = [ct["citationId"] for ct in cits]
        # cross references
        if all(re.match(r"^(fig|tbl|eq|sec):", k) for k in keys):
            parts = []
            for k in keys:
                n = self.labels.get(k)
                if n is None:
                    warn("Unknown cross-reference @%s" % k)
                    parts.append("??")
                    continue
                kind = k.split(":")[0]
                parts.append({"fig": "Fig. %s", "tbl": "Table %s", "eq": "(%s)", "sec": "Section %s"}[kind] % n)
            return self.run(", ".join(parts), fmt, base)
        nums = []
        for k in keys:
            if k in self.ref_ids:
                if k not in self.ref_order:
                    self.ref_order.append(k)
                nums.append(self.ref_order.index(k) + 1)
            else:
                warn("Citation key @%s not found in references" % k)
                return self.inlines(c[1], fmt, base)
        return self.run(", ".join("[%d]" % n for n in nums), fmt, base)

    def finalize_math(self, xml):
        def rep(m):
            om = self.math.omml[int(m.group(1))]
            if om is None:
                tex = self.math.items[int(m.group(1))][1]
                return self.run(tex, frozenset({"i"}))
            return om
        return re.sub("\x00MATH(\\d+)\x00", rep, xml)

    # ---- paragraphs --------------------------------------------------------
    @staticmethod
    def p(style, content, ppr_extra="", rpr_mark=""):
        return '<w:p><w:pPr><w:pStyle w:val="%s"/>%s%s</w:pPr>%s</w:p>' % (
            style, ppr_extra, rpr_mark, content)

    # ---- images ------------------------------------------------------------
    def load_image(self, target):
        path = target if os.path.isabs(target) else os.path.join(self.src_dir, target)
        if not os.path.exists(path):
            warn("Image not found: %s" % target)
            return None
        ext = os.path.splitext(path)[1].lower()
        if ext in (".png", ".jpg", ".jpeg", ".gif", ".bmp"):
            if ext == ".bmp" and PILImage:
                buf = io.BytesIO()
                PILImage.open(path).save(buf, "PNG")
                return buf.getvalue(), "png", path
            return open(path, "rb").read(), ext.lstrip(".").replace("jpeg", "jpg"), path
        # convert vector/other formats to PNG
        out_png = os.path.join(self.tmpdir, os.path.splitext(os.path.basename(path))[0] + ".png")
        ok = False
        if ext == ".svg":
            for cmd in (["rsvg-convert", "-d", "300", "-p", "300", "-o", out_png, path],
                        ["inkscape", path, "--export-type=png", "--export-dpi=300", "--export-filename=" + out_png]):
                if shutil.which(cmd[0]):
                    ok = subprocess.run(cmd, capture_output=True).returncode == 0 and os.path.exists(out_png)
                    if ok:
                        break
        if not ok and ext == ".pdf":
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(path)
                pdf[0].render(scale=300 / 72).to_pil().save(out_png)
                ok = True
            except Exception:
                ok = False
        if not ok and shutil.which("soffice"):
            subprocess.run(["soffice", "--headless", "--convert-to", "png", "--outdir", self.tmpdir, path],
                           capture_output=True)
            ok = os.path.exists(out_png)
        if not ok and PILImage:
            try:
                PILImage.open(path).save(out_png)
                ok = True
            except Exception:
                ok = False
        if not ok:
            warn("Could not convert image %s to PNG" % target)
            return None
        return open(out_png, "rb").read(), "png", out_png

    @staticmethod
    def parse_len(val, natural_emu):
        if not val:
            return None
        m = re.match(r"^\s*([\d.]+)\s*(cm|mm|in|px|pt|%)?\s*$", str(val))
        if not m:
            return None
        v, u = float(m.group(1)), (m.group(2) or "px")
        return int({"cm": v * 360000, "mm": v * 36000, "in": v * 914400, "pt": v * 12700,
                    "px": v * 9525, "%": v / 100.0 * MAX_IMG_W_EMU}[u])

    def image_run(self, c, inline_alt="", force_alt=None):
        attr, alt_inl, (target, title) = c
        kv = dict(attr[2])
        loaded = self.load_image(target)
        if not loaded:
            return None
        data, ext, path = loaded
        # natural size
        w_emu, h_emu = MAX_IMG_W_EMU, int(MAX_IMG_W_EMU * 0.6)
        if PILImage:
            try:
                im = PILImage.open(io.BytesIO(data))
                dpi = im.info.get("dpi", (96, 96))[0] or 96
                dpi = dpi if dpi > 30 else 96
                w_emu = int(im.width / dpi * 914400)
                h_emu = int(im.height / dpi * 914400)
            except Exception:
                pass
        ratio = h_emu / float(w_emu) if w_emu else 0.6
        req_w = self.parse_len(kv.get("width"), w_emu)
        req_h = self.parse_len(kv.get("height"), h_emu)
        if req_w and req_h:
            w_emu, h_emu = req_w, req_h
        elif req_w:
            w_emu, h_emu = req_w, int(req_w * ratio)
        elif req_h:
            w_emu, h_emu = int(req_h / ratio), req_h
        if w_emu > MAX_IMG_W_EMU:
            w_emu, h_emu = MAX_IMG_W_EMU, int(MAX_IMG_W_EMU * ratio)
        if h_emu > MAX_IMG_H_EMU:
            w_emu, h_emu = int(MAX_IMG_H_EMU / ratio), MAX_IMG_H_EMU
        if ext == "png":
            data = shrink_png(data, w_emu)
        name = "media/ij_image%d.%s" % (len(self.media) + 1, ext)
        self.media.append(("word/" + name, data))
        rid = self.add_rel(REL_IMAGE, name)
        did = self.next_docpr
        self.next_docpr += 1
        decorative = str(kv.get("decorative", "")).lower() in ("1", "true", "yes")
        alt = kv.get("alt") or (force_alt or "")
        if not alt and not decorative:
            alt = inline_alt or title or ""
            if alt:
                warn("Image %s has no explicit alt text; caption used as alt text — write a real one." % target)
            else:
                warn("Image %s has NO alt text (required by IJASITELS)." % target)
        ext_lst = ""
        if decorative:
            ext_lst = ('<a:extLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
                       '<a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}">'
                       '<adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/>'
                       '</a:ext></a:extLst>')
            alt = ""
        return (
            '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
            '<wp:extent cx="%(w)d" cy="%(h)d"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
            '<wp:docPr id="%(id)d" name="Picture %(id)d" descr="%(alt)s" title="%(alt)s">%(ext)s</wp:docPr>'
            '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:nvPicPr><pic:cNvPr id="%(id)d" name="Picture %(id)d" descr="%(alt)s"/><pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr></pic:nvPicPr>'
            '<pic:blipFill><a:blip r:embed="%(rid)s"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
            '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%(w)d" cy="%(h)d"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
            '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
        ) % {"w": w_emu, "h": h_emu, "id": did, "alt": esc(alt), "ext": ext_lst, "rid": rid}

    # ---- pre-pass: numbering of figures / tables / equations / sections -----
    def prepass(self, blocks, counters=None):
        if counters is None:
            counters = {"fig": 0, "tbl": 0, "eq": 0, "sec": [0, 0, 0, 0]}
        for b in blocks:
            t = b["t"]
            if t == "Header":
                lvl = min(b["c"][0], 4)
                if "unnumbered" not in b["c"][1][1]:
                    counters["sec"][lvl - 1] += 1
                    for j in range(lvl, 4):
                        counters["sec"][j] = 0
                    if b["c"][1][0]:
                        self.labels.setdefault("sec:" + b["c"][1][0].split(":", 1)[-1],
                                               ".".join(str(x) for x in counters["sec"][:lvl]))
                        self.labels.setdefault(b["c"][1][0], ".".join(str(x) for x in counters["sec"][:lvl]))
            elif t == "Figure":
                counters["fig"] += 1
                fid = b["c"][0][0]
                if not fid:
                    for il in self._figure_images(b):
                        fid = il["c"][0][0] or fid
                if fid:
                    self.labels[fid if ":" in fid else "fig:" + fid] = counters["fig"]
            elif t == "Table":
                counters["tbl"] += 1
                tid = b["c"][0][0] or self._table_caption_id(b["c"][1], strip=False)
                if tid:
                    self.labels[tid if ":" in tid else "tbl:" + tid] = counters["tbl"]
            elif t in ("Para", "Plain"):
                ils = b["c"]
                if self._is_lone_image(ils):
                    counters["fig"] += 1
                    fid = ils[0]["c"][0][0]
                    if fid:
                        self.labels[fid if ":" in fid else "fig:" + fid] = counters["fig"]
                for i, il in enumerate(ils):
                    if il["t"] == "Math" and il["c"][0]["t"] == "DisplayMath":
                        counters["eq"] += 1
                        lab = self._eq_label(ils, i)
                        if lab:
                            self.labels[lab] = counters["eq"]
            elif t in ("BlockQuote",):
                self.prepass(b["c"], counters)
            elif t == "Div":
                self.prepass(b["c"][1], counters)
            elif t in ("BulletList",):
                for it in b["c"]:
                    self.prepass(it, counters)
            elif t == "OrderedList":
                for it in b["c"][1]:
                    self.prepass(it, counters)

    @staticmethod
    def _eq_label(ils, i):
        j = i + 1
        while j < len(ils) and ils[j]["t"] in ("Space", "SoftBreak"):
            j += 1
        if j < len(ils) and ils[j]["t"] == "Str":
            m = re.match(r"^\{#(eq:[\w:-]+)\}", ils[j]["c"])
            if m:
                return m.group(1)
        return None

    @staticmethod
    def _table_caption_id(caption, strip=True):
        """'Table: text {#tbl:x}' -> 'tbl:x' (pandoc 3.1 keeps it as text). strip=True removes it."""
        for cb in caption[1]:
            if cb["t"] in ("Plain", "Para") and cb["c"]:
                last = cb["c"][-1]
                if last["t"] == "Str":
                    m = re.match(r"^\{#([\w:-]+)\}$", last["c"])
                    if m:
                        if strip:
                            cb["c"] = cb["c"][:-1]
                            while cb["c"] and cb["c"][-1]["t"] in ("Space", "SoftBreak"):
                                cb["c"] = cb["c"][:-1]
                        return m.group(1)
        return None

    @staticmethod
    def _is_lone_image(ils):
        real = [x for x in ils if x["t"] not in ("Space", "SoftBreak")]
        return len(real) == 1 and real[0]["t"] == "Image"

    @staticmethod
    def _figure_images(fig):
        out = []

        def walk(x):
            if isinstance(x, dict):
                if x.get("t") == "Image":
                    out.append(x)
                for v in x.values():
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
        walk(fig["c"][2])
        return out

    # ---- blocks ------------------------------------------------------------
    def blocks(self, blocks, ctx=None):
        ctx = ctx or {}
        out = []
        for b in blocks:
            out.append(self.block(b, ctx))
        return "".join(out)

    def para(self, ils, ctx, style="Normal", ppr_extra=""):
        """Normal paragraph; splits out display math as numbered equations."""
        segs, cur = [], []
        i = 0
        while i < len(ils):
            il = ils[i]
            if il["t"] == "Math" and il["c"][0]["t"] == "DisplayMath":
                segs.append(("text", cur))
                lab = self._eq_label(ils, i)
                segs.append(("eq", il["c"][1]))
                cur = []
                if lab:  # drop the {#eq:..} token
                    j = i + 1
                    while ils[j]["t"] in ("Space", "SoftBreak"):
                        j += 1
                    rest = re.sub(r"^\{#eq:[\w:-]+\}", "", ils[j]["c"])
                    i = j
                    if rest:
                        cur.append({"t": "Str", "c": rest})
                i += 1
                continue
            cur.append(il)
            i += 1
        segs.append(("text", cur))
        out = []
        for kind, val in segs:
            if kind == "text":
                while val and val[0]["t"] in ("Space", "SoftBreak"):
                    val = val[1:]
                while val and val[-1]["t"] in ("Space", "SoftBreak"):
                    val = val[:-1]
                if val:
                    out.append(self.p(style, self.inlines(val), ppr_extra))
            else:
                self.eq_no += 1
                idx = self.math.add(True, val)
                out.append(self.p("equation", '<w:r><w:tab/></w:r>\x00MATH%d\x00<w:r><w:tab/><w:t>(%d)</w:t></w:r>'
                                  % (idx, self.eq_no)))
        return "".join(out)

    def figure_xml(self, image_inline, caption_inlines, alt_override=None):
        drawing = self.image_run(image_inline["c"], inline_alt=inline_text(caption_inlines), force_alt=alt_override)
        self.fig_no += 1
        out = self.p("Figure1", drawing or self.run("[missing image]"), '<w:keepNext/><w:jc w:val="center"/>')
        if caption_inlines:
            cap = self.run("Figure %d: " % self.fig_no) + self.inlines(caption_inlines)
            out += self.p("figure", cap, '<w:spacing w:before="60" w:after="240"/>')
        else:
            warn("Figure %d has no caption." % self.fig_no)
        return out

    def block(self, b, ctx):
        t = b["t"]
        c = b.get("c")
        if t in ("Para", "Plain"):
            if self._is_lone_image(c) and not ctx.get("in_table"):
                img = [x for x in c if x["t"] == "Image"][0]
                return self.figure_xml(img, img["c"][1])
            style = ctx.get("style", "Normal")
            return self.para(c, ctx, style, ctx.get("ppr", ""))
        if t == "Header":
            lvl, attr, ils = c
            ils = self.strip_manual_number(ils)
            lvl = min(lvl, 4)
            if lvl < c[0]:
                warn("Heading level %d flattened to Heading4: %r" % (c[0], inline_text(ils)))
            extra = '<w:ind w:hanging="0" w:start="0"/>'
            if "unnumbered" in attr[1]:
                extra = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>' + extra
            return self.p("Heading%d" % lvl, self.inlines(ils), extra)
        if t == "Figure":
            attr, caption, body = c
            imgs = self._figure_images(b)
            cap_inl = []
            for cb in caption[1]:
                if cb["t"] in ("Plain", "Para"):
                    cap_inl += cb["c"]
            if not imgs:
                warn("Figure without image skipped")
                return ""
            img_alt = inline_text(imgs[0]["c"][1]).strip()
            alt_override = None
            if cap_inl and img_alt and img_alt != inline_text(cap_inl).strip():
                alt_override = img_alt   # pandoc 3.1: {alt="..."} ends up as the image's inline text
            return self.figure_xml(imgs[0], cap_inl or imgs[0]["c"][1], alt_override)
        if t == "Table":
            return self.table(c)
        if t == "BulletList":
            return self.list_xml(c, ordered=False, ctx=ctx)
        if t == "OrderedList":
            return self.list_xml(c[1], ordered=True, ctx=ctx, start=c[0][0])
        if t == "BlockQuote":
            sub = dict(ctx)
            sub["ppr"] = ctx.get("ppr", "") + '<w:ind w:start="567" w:end="567"/>'
            return self.blocks(c, sub)
        if t == "CodeBlock":
            lines = c[1].split("\n")
            runs = '<w:r><w:br/></w:r>'.join(self.run(l if l else " ", frozenset({"code"}), '<w:sz w:val="18"/><w:szCs w:val="18"/>') for l in lines)
            return self.p("Normal", runs, '<w:spacing w:before="120" w:after="120"/><w:ind w:start="284"/><w:jc w:val="start"/>')
        if t == "LineBlock":
            return self.p(ctx.get("style", "Normal"), '<w:r><w:br/></w:r>'.join(self.inlines(l) for l in c))
        if t == "Div":
            return self.blocks(c[1], ctx)
        if t == "HorizontalRule":
            return ""
        if t == "RawBlock":
            if c[0] == "openxml":
                return c[1]
            if c[0] in ("latex", "tex") and c[1].strip() in ("\\newpage", "\\pagebreak", "\\clearpage"):
                return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
            return ""
        if t in ("DefinitionList",):
            out = []
            for term, defs in c:
                out.append(self.p("Normal", self.inlines(term, frozenset({"b"})), "<w:keepNext/>"))
                for d in defs:
                    sub = dict(ctx)
                    sub["ppr"] = '<w:ind w:start="567"/>'
                    out.append(self.blocks(d, sub))
            return "".join(out)
        warn("Unsupported block %s skipped" % t)
        return ""

    @staticmethod
    def strip_manual_number(ils):
        ils = list(ils)
        if ils and ils[0]["t"] == "Str" and re.match(r"^((\d+\.)*\d+\.?|[IVXLC]+\.|[A-Z]\.)$", ils[0]["c"]):
            j = 1
            while j < len(ils) and ils[j]["t"] in ("Space", "SoftBreak"):
                j += 1
            if j < len(ils):
                return ils[j:]
        if ils and ils[0]["t"] == "Str":
            m = re.match(r"^((\d+\.)*\d+\.?)(\S+)$", ils[0]["c"])
            if m and not m.group(3)[0].isdigit() and m.group(1).endswith("."):
                ils[0] = {"t": "Str", "c": m.group(3)}
        return ils

    # ---- lists -------------------------------------------------------------
    def list_xml(self, items, ordered, ctx, start=1, level=0):
        if ordered:
            num_id = self.next_num_id
            self.next_num_id += 1
            self.ordered_lists.append((num_id, start))
        else:
            num_id = 20
        out = []
        for item in items:
            first = True
            for blk in item:
                if blk["t"] in ("Para", "Plain") and first:
                    numpr = '<w:numPr><w:ilvl w:val="%d"/><w:numId w:val="%d"/></w:numPr>' % (level, num_id)
                    out.append(self.p("Normal", self.inlines(blk["c"]),
                                      numpr + '<w:spacing w:before="60" w:after="60"/>'))
                    first = False
                elif blk["t"] == "BulletList":
                    out.append(self.list_xml(blk["c"], False, ctx, level=level + 1))
                elif blk["t"] == "OrderedList":
                    out.append(self.list_xml(blk["c"][1], True, ctx, start=blk["c"][0][0], level=level + 1))
                else:
                    sub = dict(ctx)
                    sub["ppr"] = '<w:ind w:start="%d"/>' % (720 + 360 * level)
                    out.append(self.block(blk, sub))
                    first = False
        return "".join(out)

    # ---- tables ------------------------------------------------------------
    def table(self, c):
        attr, caption, colspecs, thead, tbodies, tfoot = c
        ncols = len(colspecs)
        self.tbl_no += 1
        self._table_caption_id(caption, strip=True)
        cap_inl = []
        for cb in caption[1]:
            if cb["t"] in ("Plain", "Para"):
                cap_inl += cb["c"]
        out = []
        if cap_inl:
            out.append(self.p("figure", self.run("Table %d. " % self.tbl_no) + self.inlines(cap_inl),
                              '<w:keepNext/><w:spacing w:before="240" w:after="60"/>'))
        else:
            warn("Table %d has no caption (IJASITELS: table heads above tables)." % self.tbl_no)
        # widths
        fracs = []
        for cs in colspecs:
            w = cs[1]
            fracs.append(w["c"] if isinstance(w, dict) and w.get("t") == "ColWidth" else None)
        if any(f is None for f in fracs) or sum(f for f in fracs if f) <= 0:
            fracs = [1.0 / ncols] * ncols
        tot = sum(fracs)
        widths = [int(TEXT_WIDTH_TW * f / tot) for f in fracs]
        fs = self.table_font_size or (12 if ncols <= 4 else 10)
        size_xml = '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (fs * 2, fs * 2)
        aligns = [cs[0]["t"] for cs in colspecs]
        border = ('<w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
                  '<w:start w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
                  '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
                  '<w:end w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tcBorders>')
        rows = []  # (is_header, cells)
        rows += [(True, r) for r in thead[1]]
        for tb in tbodies:
            rows += [(True, r) for r in tb[2]]
            rows += [(False, r) for r in tb[3]]
        rows += [(False, r) for r in tfoot[1]]
        pending = {}  # col -> remaining rowspan count
        trs = []
        for is_head, row in rows:
            cells = row[1]
            tcs = []
            col = 0
            ci = 0
            while col < ncols:
                if pending.get(col, 0) > 0:
                    span = pending.get(("span", col), 1)
                    pending[col] -= 1
                    w = sum(widths[col:col + span])
                    gs = '<w:gridSpan w:val="%d"/>' % span if span > 1 else ""
                    tcs.append('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>%s<w:vMerge/>%s</w:tcPr><w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc>' % (w, gs, border))
                    col += span
                    continue
                if ci >= len(cells):
                    tcs.append('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>%s</w:tcPr><w:p/></w:tc>' % (widths[col], border))
                    col += 1
                    continue
                cattr, calign, rspan, cspan, cblocks = cells[ci]
                ci += 1
                cspan = max(1, min(cspan, ncols - col))
                w = sum(widths[col:col + cspan])
                gs = '<w:gridSpan w:val="%d"/>' % cspan if cspan > 1 else ""
                vm = ""
                if rspan > 1:
                    vm = '<w:vMerge w:val="restart"/>'
                    pending[col] = rspan - 1
                    pending[("span", col)] = cspan
                al = calign["t"] if calign["t"] != "AlignDefault" else aligns[col]
                jc = {"AlignLeft": "start", "AlignRight": "end", "AlignCenter": "center"}.get(al, "start")
                if is_head:
                    jc = "center" if al == "AlignDefault" else jc
                paras = []
                for cb in cblocks:
                    if cb["t"] in ("Plain", "Para"):
                        fmt = frozenset({"b"}) if is_head else frozenset()
                        paras.append(self.p("Normal", self.inlines(cb["c"], fmt, size_xml),
                                            '<w:spacing w:before="0" w:after="0"/><w:jc w:val="%s"/>' % jc))
                    else:
                        paras.append(self.block(cb, {"in_table": True}))
                if not paras:
                    paras.append('<w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>')
                tcs.append('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>%s%s%s<w:vAlign w:val="center"/></w:tcPr>%s</w:tc>'
                           % (w, gs, vm, border, "".join(paras)))
                col += cspan
            trpr = '<w:trPr>%s<w:cantSplit/></w:trPr>' % ('<w:tblHeader/>' if is_head else "")
            trs.append("<w:tr>%s%s</w:tr>" % (trpr, "".join(tcs)))
        grid = "".join('<w:gridCol w:w="%d"/>' % w for w in widths)
        tbl = ('<w:tbl><w:tblPr><w:tblW w:w="%d" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/>'
               '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:start w:w="108" w:type="dxa"/>'
               '<w:bottom w:w="0" w:type="dxa"/><w:end w:w="108" w:type="dxa"/></w:tblCellMar>'
               '<w:tblLook w:val="04a0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
               '</w:tblPr><w:tblGrid>%s</w:tblGrid>%s</w:tbl>') % (sum(widths), grid, "".join(trs))
        out.append(tbl)
        out.append('<w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>')
        return "".join(out)


# --------------------------------------------------------------------------
# Front matter
# --------------------------------------------------------------------------

def split_front_matter(text):
    m = re.match(r"^﻿?---\s*\n(.*?)\n(---|\.\.\.)\s*\n(.*)$", text, re.S)
    if not m:
        sys.exit("The source must start with a YAML front matter block (--- ... ---).")
    return yaml.safe_load(m.group(1)) or {}, m.group(3)


def norm_list(v):
    if v is None:
        return []
    if isinstance(v, str):
        return [x.strip() for x in re.split(r"[;,]", v) if x.strip()]
    return list(v)


LINE_P = ('<w:p><w:pPr><w:pStyle w:val="line"/><w:tabs><w:tab w:val="clear" w:pos="9070"/>'
          '<w:tab w:val="right" w:pos="8364" w:leader="none"/></w:tabs><w:ind w:start="851"/>'
          '<w:rPr><w:b/><w:lang w:val="en-US"/></w:rPr></w:pPr><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:tab/></w:r></w:p>')


def parse_md_fields(fields, api):
    """fields: list of markdown strings -> list of block lists (one pandoc call)."""
    sep = "\n\n<!-- IJ-SPLIT -->\n\n"
    doc = pandoc_json(sep.join(f if f.strip() else "​" for f in fields), "-implicit_figures")
    out, cur = [], []
    for b in doc["blocks"]:
        if b["t"] == "RawBlock" and "IJ-SPLIT" in b["c"][1]:
            out.append(cur)
            cur = []
        else:
            cur.append(b)
    out.append(cur)
    # drop empty placeholder fields
    return [[b for b in seg if not (b["t"] in ("Para", "Plain") and not inline_text(b["c"]).replace("\u200b", "").strip())]
            for seg in out]


def extract_body_sections(blocks):
    """Pull References / Acknowledgment sections that were left in the body."""
    body, refs, ack = [], [], []
    mode = None
    for b in blocks:
        if b["t"] == "Header":
            name = inline_text(Builder.strip_manual_number(b["c"][2])).strip().lower().rstrip(":")
            if name in ("references", "reference", "bibliography", "bibliografie", "referințe", "referinte",
                        "works cited", "literature cited"):
                mode = "refs"
                continue
            if re.match(r"^acknowledge?ments?$|^mulțumiri$|^multumiri$", name):
                mode = "ack"
                continue
            if b["c"][0] == 1 or mode is None:
                mode = None
        if mode == "refs":
            if b["t"] in ("OrderedList", "BulletList"):
                items = b["c"][1] if b["t"] == "OrderedList" else b["c"]
                for it in items:
                    ils = []
                    for blk in it:
                        if blk["t"] in ("Para", "Plain"):
                            ils += blk["c"]
                    refs.append(ils)
            elif b["t"] in ("Para", "Plain"):
                refs.append(b["c"])
            elif b["t"] == "Div":
                for blk in b["c"][1]:
                    if blk["t"] in ("Para", "Plain"):
                        refs.append(blk["c"])
        elif mode == "ack":
            ack.append(b)
        else:
            body.append(b)
    return body, refs, ack


def strip_ref_number(ils):
    ils = list(ils)
    while ils and ils[0]["t"] in ("Space", "SoftBreak"):
        ils = ils[1:]
    if ils and ils[0]["t"] == "Str":
        m = re.match(r"^(\[\d+\]|\d+\.|\(\d+\))(.*)$", ils[0]["c"])
        if m:
            rest = m.group(2)
            ils = ([{"t": "Str", "c": rest}] if rest else []) + ils[1:]
            while ils and ils[0]["t"] in ("Space", "SoftBreak"):
                ils = ils[1:]
    return ils


# --------------------------------------------------------------------------
# Main assembly
# --------------------------------------------------------------------------

def build(src_path, out_path, template, table_font_size=None):
    text = open(src_path, encoding="utf-8").read()
    meta, body_md = split_front_matter(text)
    src_dir = os.path.dirname(os.path.abspath(src_path))
    B = Builder(src_dir, table_font_size)

    body_doc = pandoc_json(body_md, "-yaml_metadata_block")
    api = body_doc["pandoc-api-version"]
    body_blocks, body_refs, body_ack = extract_body_sections(body_doc["blocks"])

    # ---- front matter fields -------------------------------------------------
    title = (meta.get("title") or "").strip()
    if not title:
        warn("Missing title")
    authors = meta.get("authors") or []
    if isinstance(authors, str):
        authors = [{"name": a} for a in norm_list(authors)]
    affs = meta.get("affiliations") or []
    if isinstance(affs, str):
        affs = [affs]
    aff_list = []
    for i, a in enumerate(affs):
        if isinstance(a, dict):
            aff_list.append((str(a.get("id", i + 1)), a.get("text") or a.get("name") or ""))
        else:
            aff_list.append((str(i + 1), str(a)))
    abstract = meta.get("abstract") or ""
    keywords = norm_list(meta.get("keywords"))
    ack_md = meta.get("acknowledgment") or meta.get("acknowledgement") or meta.get("acknowledgments") or ""
    refs_meta = meta.get("references") or []
    journal = meta.get("journal") or {}

    ref_entries = []  # (key or None, markdown)
    for i, r in enumerate(refs_meta):
        if isinstance(r, dict):
            ref_entries.append((r.get("id"), r.get("text", "")))
        else:
            ref_entries.append((None, str(r)))
    fields = [title, abstract, ack_md] + [a[1] for a in aff_list] + [r[1] for r in ref_entries]
    parsed = parse_md_fields(fields, api)
    title_bl, abs_bl, ack_bl = parsed[0], parsed[1], parsed[2]
    aff_bl = parsed[3:3 + len(aff_list)]
    ref_bl = parsed[3 + len(aff_list):]

    keyed = any(k for k, _ in ref_entries)
    ref_inlines = []
    for (key, _), bl in zip(ref_entries, ref_bl):
        ils = []
        for blk in bl:
            if blk["t"] in ("Para", "Plain"):
                ils += blk["c"]
        ref_inlines.append((key, strip_ref_number(ils)))
    if body_refs:
        if ref_entries:
            warn("References found both in front matter and body; body list ignored.")
        else:
            ref_inlines = [(None, strip_ref_number(r)) for r in body_refs]
    for i, (key, _) in enumerate(ref_inlines):
        if key:
            B.ref_ids[key] = i

    if body_ack and not ack_bl:
        ack_bl = body_ack

    # ---- render ----------------------------------------------------------------
    B.prepass(body_blocks)
    parts = []
    t_inl = title_bl[0]["c"] if title_bl and title_bl[0]["t"] in ("Para", "Plain") else []
    parts.append('<w:p><w:pPr><w:pStyle w:val="Title"/><w:spacing w:before="240" w:after="480"/>'
                 '<w:ind w:start="567"/><w:jc w:val="start"/></w:pPr>%s</w:p>' % B.inlines(t_inl))
    # authors
    au_runs = []
    lang = '<w:lang w:val="en-US"/>'
    for i, a in enumerate(authors):
        if isinstance(a, str):
            a = {"name": a}
        name = (a.get("name") or "").strip()
        aff_ids = [str(x) for x in norm_list(a.get("affiliation", a.get("affil", a.get("affiliations"))))]
        if not aff_ids and len(aff_list) == 1:
            aff_ids = [aff_list[0][0]]
        orcid = (a.get("orcid") or "").strip()
        orcid = re.sub(r"^https?://orcid\.org/", "", orcid)
        if not orcid:
            warn("Author %r has no ORCID (template asks for [ORCID number])." % name)
        sep = ", " if i else ""
        au_runs.append(B.run(sep + name, frozenset(), lang))
        sup = ",".join(aff_ids) + ("[%s]" % orcid if orcid else "")
        if a.get("corresponding"):
            sup += "*"
        if sup:
            au_runs.append(B.run(sup, frozenset({"sup"}), lang))
    parts.append(B.p("Authors", "".join(au_runs)))
    for (aid, _), bl in zip(aff_list, aff_bl):
        ils = bl[0]["c"] if bl and bl[0]["t"] in ("Para", "Plain") else []
        parts.append(B.p("Affiliation", B.run(aid, frozenset({"sup"}), lang) + B.inlines(ils, frozenset(), lang)))
    emails = []
    for a in authors:
        if isinstance(a, dict) and a.get("email"):
            emails.append(a["email"].strip())
    if emails:
        parts.append(B.p("Affiliation", B.run("E-mail: " + ", ".join(emails), frozenset(), lang)))
    else:
        warn("No author e-mail given (template: name, affiliation and e-mail must be filled in).")
    if not aff_list:
        warn("No affiliations given.")
    parts.append(LINE_P)
    # abstract
    parts.append(B.p("Abstract", B.run("Abstract", frozenset({"b"}), lang)))
    for blk in abs_bl:
        if blk["t"] in ("Para", "Plain"):
            parts.append(B.p("Abstract", B.inlines(blk["c"], frozenset(), lang)))
    kw = ", ".join(keywords)
    parts.append(B.p("Keywords", B.run("Keywords", frozenset({"b"}), lang) + B.run(": " + kw, frozenset(), lang)))
    parts.append(LINE_P)
    # body
    parts.append(B.blocks(body_blocks))
    # acknowledgment
    if ack_bl:
        parts.append(B.p("Acknowledgment", B.run("Acknowledgment")))
        parts.append(B.blocks(ack_bl))
    # references (numbering may depend on citation order -> render after body)
    if ref_inlines:
        if keyed:
            order = list(B.ref_order)
            for key, _ in ref_inlines:
                if key and key not in order:
                    warn("Reference @%s is never cited in the text." % key)
                    order.append(key)
            by_key = {k: ils for k, ils in ref_inlines if k}
            ordered = [by_key[k] for k in order] + [ils for k, ils in ref_inlines if not k]
        else:
            ordered = [ils for _, ils in ref_inlines]
        parts.append(B.p("Reference", B.run("References")))
        rbase = '<w:spacing w:val="4"/><w:sz w:val="20"/><w:szCs w:val="20"/>'
        for n, ils in enumerate(ordered, 1):
            parts.append(B.p("Normal", B.run("[%d] " % n, frozenset(), rbase) + B.inlines(ils, frozenset(), rbase),
                             '<w:widowControl/><w:spacing w:before="120" w:after="120"/><w:jc w:val="both"/>'))
    else:
        warn("No references found.")

    # math conversion and substitution
    B.math.convert(api)
    body_xml = B.finalize_math("".join(parts))

    write_package(template, out_path, body_xml, B, meta, title, authors, keywords, abstract, journal)
    shutil.rmtree(B.tmpdir, ignore_errors=True)
    return B


def write_package(template, out_path, body_xml, B, meta, title, authors, keywords, abstract, journal):
    zin = zipfile.ZipFile(template)
    names = zin.namelist()
    doc = zin.read("word/document.xml").decode("utf-8")
    root_open = re.search(r"<w:document\b[^>]*>", doc).group(0)
    # Template first-section page setup; one section, distinct first page.
    sect = ('<w:sectPr><w:headerReference w:type="first" r:id="rId4"/>'
            '<w:headerReference w:type="default" r:id="rId12"/>'
            '<w:footerReference w:type="first" r:id="rId7"/>'
            '<w:footerReference w:type="default" r:id="rId14"/>'
            '<w:type w:val="nextPage"/><w:pgSz w:w="11906" w:h="16838"/>'
            '<w:pgMar w:left="1797" w:right="1797" w:gutter="0" w:header="709" w:top="1701" w:footer="766" w:bottom="1701"/>'
            '<w:pgNumType w:fmt="decimal"/><w:formProt w:val="false"/><w:titlePg/><w:textDirection w:val="lrTb"/>'
            '<w:docGrid w:type="default" w:linePitch="600" w:charSpace="32768"/></w:sectPr>')
    new_doc = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + root_open +
               "<w:body>" + body_xml + sect + "</w:body></w:document>")
    etree.fromstring(new_doc.encode("utf-8"))  # well-formedness check

    # relationships: keep template's non-media rels, drop images/hyperlinks, add ours
    rels = zin.read("word/_rels/document.xml.rels").decode("utf-8")
    rels = re.sub(r'<Relationship [^>]*Type="[^"]*/(image|hyperlink)"[^>]*/>', "", rels)
    add = []
    for rid, rtype, target, external in B.rels:
        add.append('<Relationship Id="%s" Type="%s" Target="%s"%s/>' % (
            rid, rtype, esc(target), ' TargetMode="External"' if external else ""))
    rels = rels.replace("</Relationships>", "".join(add) + "</Relationships>")

    # numbering: add bullet (20) + decimal list abstract numbers
    numbering = zin.read("word/numbering.xml").decode("utf-8")
    bullets = ["•", "◦", "▪", "•", "◦"]
    lv_b = "".join('<w:lvl w:ilvl="%d"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="%s"/>'
                   '<w:lvlJc w:val="start"/><w:pPr><w:ind w:start="%d" w:hanging="360"/></w:pPr>'
                   '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/></w:rPr></w:lvl>'
                   % (i, bullets[i], 720 + 360 * i) for i in range(5))
    fmts = ["decimal", "lowerLetter", "lowerRoman", "decimal", "lowerLetter"]
    lv_d = "".join('<w:lvl w:ilvl="%d"><w:start w:val="1"/><w:numFmt w:val="%s"/><w:lvlText w:val="%%%d."/>'
                   '<w:lvlJc w:val="start"/><w:pPr><w:ind w:start="%d" w:hanging="360"/></w:pPr></w:lvl>'
                   % (i, fmts[i], i + 1, 720 + 360 * i) for i in range(5))
    absn = ('<w:abstractNum w:abstractNumId="20"><w:multiLevelType w:val="hybridMultilevel"/>%s</w:abstractNum>'
            '<w:abstractNum w:abstractNumId="21"><w:multiLevelType w:val="hybridMultilevel"/>%s</w:abstractNum>') % (lv_b, lv_d)
    nums = '<w:num w:numId="20"><w:abstractNumId w:val="20"/></w:num>'
    for num_id, start in B.ordered_lists:
        nums += ('<w:num w:numId="%d"><w:abstractNumId w:val="21"/><w:lvlOverride w:ilvl="0">'
                 '<w:startOverride w:val="%d"/></w:lvlOverride></w:num>') % (num_id, start or 1)
    first_num = numbering.find("<w:num ")
    numbering = numbering[:first_num] + absn + numbering[first_num:]
    numbering = numbering.replace("</w:numbering>", nums + "</w:numbering>")

    # content types for images
    ct = zin.read("[Content_Types].xml").decode("utf-8")
    for ext, mime in (("png", "image/png"), ("jpg", "image/jpeg"), ("jpeg", "image/jpeg"), ("gif", "image/gif")):
        if 'Extension="%s"' % ext not in ct:
            ct = ct.replace("</Types>", '<Default Extension="%s" ContentType="%s"/></Types>' % (ext, mime))

    # headers / footers (journal issue, DOI, year)
    def hdr_sub(xml, old, new):
        return xml.replace(esc(old), esc(new)) if new else xml
    h_first = zin.read("word/header3.xml").decode("utf-8")
    h_def = zin.read("word/header5.xml").decode("utf-8")
    f_first = zin.read("word/footer3.xml").decode("utf-8")
    issue = journal.get("issue") or journal.get("header")
    h_def = hdr_sub(h_def, "December 2026* Vol. XVI, no. 1", issue)
    doi = journal.get("doi")
    if doi:
        h_first = h_first.replace("<w:t>________________</w:t>", "<w:t>%s</w:t>" % esc(str(doi)))
    year = journal.get("year")
    if year:
        f_first = f_first.replace("© 2026 Lucian", "© %s Lucian" % esc(str(year)))

    # core properties
    now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    creators = ";".join((a.get("name") if isinstance(a, dict) else str(a)) for a in authors)
    core = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
            'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            '<dc:title>%s</dc:title><dc:subject>%s</dc:subject><dc:creator>%s</dc:creator>'
            '<cp:keywords>%s</cp:keywords><dc:language>en-GB</dc:language><cp:revision>1</cp:revision>'
            '<dcterms:created xsi:type="dcterms:W3CDTF">%s</dcterms:created>'
            '<dcterms:modified xsi:type="dcterms:W3CDTF">%s</dcterms:modified></cp:coreProperties>'
            ) % (esc(re.sub(r"[*_`]", "", title)), "IJASITELS", esc(creators), esc(", ".join(keywords)), now, now)

    replaced = {
        "word/document.xml": new_doc, "word/_rels/document.xml.rels": rels,
        "word/numbering.xml": numbering, "[Content_Types].xml": ct,
        "word/header3.xml": h_first, "word/header5.xml": h_def, "word/footer3.xml": f_first,
        "docProps/core.xml": core,
    }
    tmp_out = out_path + ".tmp"
    with zipfile.ZipFile(tmp_out, "w", zipfile.ZIP_DEFLATED) as zout:
        # [Content_Types].xml first
        order = ["[Content_Types].xml"] + [n for n in names if n != "[Content_Types].xml"]
        for n in order:
            if n.startswith("word/media/"):
                continue  # template sample images are not part of the paper
            data = replaced.get(n)
            zout.writestr(n, data.encode("utf-8") if data is not None else zin.read(n))
        for n, data in B.media:
            zout.writestr(n, data)
    os.replace(tmp_out, out_path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", help="IJASITELS source Markdown (.md with YAML front matter)")
    ap.add_argument("-o", "--output", help="output .docx (default: <source>_IJASITELS.docx)")
    ap.add_argument("--template", default=DEFAULT_TEMPLATE)
    ap.add_argument("--table-font-size", type=int, default=None,
                    help="font size (pt) for table cells; default 12 for <=4 columns, else 10")
    a = ap.parse_args()
    out = a.output or re.sub(r"(\.ijasitels)?\.md$", "", a.source) + "_IJASITELS.docx"
    build(a.source, out, os.path.abspath(a.template), a.table_font_size)
    print("OK: wrote %s" % out)
    if WARNINGS:
        seen = []
        for w in WARNINGS:
            if w not in seen:
                seen.append(w)
        print("\nWARNINGS (%d):" % len(seen))
        for w in seen:
            print("  - " + w)


if __name__ == "__main__":
    main()
