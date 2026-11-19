---
name: ijasitels-template
description: Convert any manuscript (DOCX, DOC, ODT, PDF, Markdown, LaTeX, HTML, TXT) into a Word .docx formatted to the official IJASITELS template (International Journal of Advanced Statistics and IT&C for Economics and Life Sciences, Lucian Blaga University of Sibiu). The output is ALWAYS a .docx built inside the official template - its Title/Authors/Affiliation/Abstract/Keywords styles, numbered Heading1-4, equation/figure/table/reference formats, A4 page setup, DOI header, CC BY 4.0 footer - then validated against every template rule. Trigger on "IJASITELS format/template", "formateaza pentru IJASITELS", "pune articolul in template-ul IJASITELS", "convert paper to IJASITELS", or any request to prepare a paper for submission to this journal.
---

# IJASITELS Template Skill

Turns an input manuscript into a submission-ready `.docx` that follows the official
IJASITELS Word template exactly. The deliverable is **always a .docx**.

```
input (pdf/docx/md/...) ──extract_input.py──▶ extracted.md + media/
        ──(you: restructure to IJASITELS rules)──▶ <name>.ijasitels.md
        ──build_ijasitels.py──▶ <name>_IJASITELS.docx
        ──check_ijasitels.py --pdf──▶ report + PDF + PNG previews (fix, rebuild, repeat)
```

Skill folder: `~/.agents/skills/ijasitels-template/`

| File | Role |
|---|---|
| `assets/template_IJASITELS.docx` | Official template. Styles, numbering, headers/footers, page setup are reused verbatim. |
| `scripts/extract_input.py` | Any input → `extracted.md` + `media/` (pandoc; LibreOffice for .doc/.rtf; pdfplumber for PDF). |
| `scripts/build_ijasitels.py` | IJASITELS source Markdown → .docx inside the template. Prints warnings. |
| `scripts/check_ijasitels.py` | Validates a .docx against the template rules; `--pdf` renders PDF + page PNGs. |
| `references/source-format.md` | Full syntax of the source Markdown (front matter, figures, tables, equations, cross-refs, citations). **Read it before writing the source file.** |
| `references/ijasitels-rules.md` | Every rule from the template, with the exact style values. |
| `assets/example.ijasitels.md` | Complete working example (figure, table, equation, list, citations). |

## Workflow

Work in a scratch folder (the session scratchpad), never inside the skill folder. Save the
final .docx **next to the input file** as `<input name>_IJASITELS.docx` unless the user names another path.

### 1. Extract

```bash
python3 ~/.agents/skills/ijasitels-template/scripts/extract_input.py "<input>" <workdir>
```

Read `<workdir>/extracted.md` completely and `extract_info.txt`. For PDFs, look at
`media/page_NNN.png` to understand layout, tables, equations and vector figures (crop a
figure from a page render with PIL if it was not extracted as an image).

### 2. Write `<workdir>/<name>.ijasitels.md`

Follow `references/source-format.md`. This is the step that needs judgment. Rules:

**Front matter** (YAML): `title`, `authors` (name, affiliation ids, orcid, email),
`affiliations` (institution + department + city, country), `abstract`, `keywords`,
`acknowledgment`, `references`, optional `journal` (issue/doi/year).

**Never invent data.** Missing ORCID, e-mail, department, DOI, page numbers, ISBN/ISSN → leave
them out (the builder/checker warns) and list them for the user at the end. Do not fabricate
reference details either.

**Content transformation required by IJASITELS** (do these, then report them):
- **English only.** If the input is in another language, translate faithfully to academic
  English (keep numbers, terminology, meaning). Tell the user it was translated.
- **Abstract ≤ 300 words**, single block stating purpose, methodology, findings, conclusions.
  If longer, condense without changing claims; report the original and new word counts.
- **3-5 keywords.** If more, keep the 5 most specific; if fewer/missing, derive them from
  title/abstract. Report it.
- **Section structure:** first numbered section is *Introduction*, last is *Conclusions*
  (keep the author's wording if it is e.g. "Conclusions and Future Work"). Remove manual
  heading numbers ("1.", "2.3", "II.") - numbering comes from the Heading styles.
  Max 4 heading levels. Acknowledgment and References are NOT numbered sections - put them in
  the front matter (`acknowledgment`, `references`), not in the body.
- **Citations:** numbered `[n]`. Convert author-year citations ("(Smith, 2020)", "Smith et al.
  [2020]") to `[@key]` cites; the builder numbers references in order of first citation.
  Keep a narrative author name when the sentence needs it: "Smith et al. [@smith2020] showed...".
- **References** in the template format, title in italics:
  - book: `Author name, *Book title*, Publishing house, City, ISBN X, year.`
  - article/paper: `Author1, Author2, *Article name*, Journal or Proceedings name, pages, ISSN/ISBN, City (for conferences), year.`
  - add `DOI`/URL at the end when known. Authors as "A. B. Surname" or as given - be consistent.
- **Figures:** every figure gets a caption (placed *below* by the builder as "Figure n: ...")
  and a real **alt text** (`alt="..."`: what the image shows that the caption doesn't - key
  trend/shape/values, 1-2 sentences). Decorative logos: `decorative=true`. Delete the
  original caption paragraph (e.g. "**Fig. 1.** ...") from the body - otherwise it appears twice.
  In text, refer to figures as **"Fig. n"** (use `@fig:id`).
- **Tables:** caption *above* (`Table: caption {#tbl:id}` before the table), refer as
  "Table n" (`@tbl:id`). Delete the original "Table 1. ..." caption line. Complex tables
  (merged cells) → grid table syntax or a simplified pipe table.
- **Equations:** display equations as `$$ ... $$ {#eq:id}` on their own line; they are numbered
  (1), (2)... right-aligned automatically. Cite as **"(n)"** (`@eq:id`), never "Eq. (n)" or
  "equation (n)" - except at the start of a sentence: "Equation @eq:id shows..." renders
  "Equation (1)". Convert equation images from PDFs to LaTeX when legible.
- **Underline → italics.** Footnotes: fold into the text (the builder turns leftovers into
  parenthetical text and warns).
- Keep the author's scientific content, results, numbers and argument unchanged. Formatting
  and the required transformations above are the only edits unless the user asks for more.

### 3. Build

```bash
python3 ~/.agents/skills/ijasitels-template/scripts/build_ijasitels.py <workdir>/<name>.ijasitels.md -o "<output>.docx"
```

Fix every warning that is fixable in the source (missing alt text, unknown cross-ref, citation
key not found, uncited reference, missing caption) and rebuild.

### 4. Validate (mandatory) and look at it

```bash
python3 ~/.agents/skills/ijasitels-template/scripts/check_ijasitels.py "<output>.docx" --pdf
```

- 0 errors required. Fix the source and rebuild until clean; remaining warnings must be ones
  only the authors can resolve (missing ORCID/e-mail/DOI).
- Open at least page 1, one page with a table, one with a figure and the references page from
  `<output>_preview/` (Read tool) and compare with the template look (see
  `references/ijasitels-rules.md` > Visual check). The PDF is a preview only; delete it and
  the `_preview` folder afterwards unless the user wants them (the journal also asks for a PDF
  at submission - offer it).
- Equations render blank in the preview when `libreoffice-math` is not installed; that is a
  preview limitation, Word shows them. Verify equations by text instead (equation paragraphs
  exist and are numbered - the checker does this).

### 5. Report to the user

Short: output path; what was transformed (translation, abstract condensed N→M words,
keywords changed, citations converted, references reformatted, captions/alt texts written);
open items for the authors (missing ORCID/e-mail/DOI/reference details) - each one concrete.

## Builder behaviour you can rely on

- One A4 section, margins 30/30/31.7/31.7 mm. Page 1: header "DOI: ____" (or the DOI) and footer
  "© <year> Lucian Blaga University of Sibiu" + CC BY 4.0 notice. Pages 2+: centered journal
  header "International Journal of Advanced Statistics and IT&C for Economics and Life Sciences /
  December 2026* Vol. XVI, no. 1" (override via `journal.issue`).
- Front matter in template styles: Title (24 pt), Authors (16 pt italic, superscript
  `affil[ORCID]`), Affiliation (12 pt italic, superscript id), E-mail line, rule line, Abstract
  (10 pt, indented, bold "Abstract"), Keywords (bold "Keywords: ..."), rule line.
- Headings → Heading1-4 with automatic 1 / 1.1 / 1.1.1 numbering; `{.unnumbered}` disables it.
- Figures inline, centred, kept with caption; `width=` (cm/mm/in/%) or auto-fit to text width;
  SVG/EMF/WMF/PDF images converted to PNG.
- Tables: full text width, single black borders, bold repeated header row, rows don't split;
  cell font 12 pt (≤4 columns) or 10 pt (`--table-font-size` to override).
- Lists (bullets, numbered, nested), block quotes, code blocks (Courier New 9 pt), hyperlinks,
  inline math, sub/superscript, `\newpage` page breaks.
- Acknowledgment (style Acknowledgment) then References (style Reference heading, entries 10 pt
  "[n] ...").
- Document properties: title, authors, keywords, language en-GB.
