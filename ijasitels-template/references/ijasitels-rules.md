# IJASITELS template rules (from `assets/template_IJASITELS.docx`)

Journal: International Journal of Advanced Statistics and IT&C for Economics and Life Sciences
(IJASITELS), ISSN 2067-354X, Lucian Blaga University of Sibiu, since 2009.
Editor in Chief Daniel Morariu; Editor Radu G. Cretulescu.
Submission site: reviste.ulbsibiu.ro/ijasitels (magazines.ulbsibiu.ro/ijasitels).

## Submission requirements

- English only.
- First page: title, author name(s), affiliation (institution and department) and e-mail,
  abstract of about 300 words (no more than 300), 3-5 keywords.
- Abstract states: purpose of the work, methodology, important findings, conclusions.
- Title: very specific, not too broad.
- Send the source (.docx, or .tex with `template_IJASITELS.tex`) **and a PDF**, plus a signed
  copyright transfer form (downloadable from the journal site).
- Licence: CC BY 4.0 (first-page footer).

## Page

| Item | Value | OOXML |
|---|---|---|
| Paper | A4, one column | 11906 x 16838 twips |
| Margins | top 30, bottom 30, left 31.7, right 31.7 mm | 1701 / 1701 / 1797 / 1797 |
| First page header | "DOI: ________________" Arial 10 pt, right | header3.xml |
| First page footer | "© 2026 Lucian Blaga University of Sibiu" + CC BY 4.0 text, 8 pt | footer3.xml |
| Other pages header | journal name / "December 2026* Vol. XVI, no. 1", Arial 9 pt, centred, bottom border | header5.xml |

## Styles (style id → format)

| Element | Style | Format |
|---|---|---|
| Paper title | `Title` | TNR 24 pt, left, indent left 10 mm, before 12 / after 24 pt |
| Authors | `Authors` | TNR 16 pt italic, left, indent 10 mm; superscript `1[ORCID]` after each name |
| Affiliation | `Affiliation` | TNR 12 pt italic, left, indent 10 mm, before/after 3 pt; superscript id first |
| Separator line | `line` | thick-underlined right tab, after affiliations and after keywords |
| Abstract | `Abstract` | TNR 10 pt, indent left 15 mm, before/after 3-6 pt; first paragraph = bold "Abstract" |
| Keywords | `Keywords` | TNR 10 pt, indent 15 mm; bold "Keywords" + ": a, b, c" |
| Body text | `Normal` | TNR 12 pt, justified, before/after 6 pt, single spacing, no first-line indent |
| Section | `Heading1` | TNR 16 pt bold, left, before 24 / after 12 pt, numbered 1, 2, 3 |
| Subsection | `Heading2` | TNR 14 pt bold, before 18 / after 12 pt, numbered 1.1 |
| Sub-subsection | `Heading3` | TNR 13 pt bold, before/after 12 pt, numbered 1.1.1 |
| Level 4 | `Heading4` | TNR 12 pt bold, numbered 1.1.1.1 |
| Equation | `equation` | TNR 12 pt, tabs: centre 67.5 mm, right 142.5 mm; `<tab>equation<tab>(n)` |
| Figure caption / table head | `figure` | TNR 10 pt, centred |
| Figure image paragraph | `Figure1` | centred |
| Acknowledgment title | `Acknowledgment` | TNR 14 pt bold, unnumbered; content in Normal |
| References title | `Reference` | Arial 16 pt bold, unnumbered |
| Reference entries | `Normal` + 10 pt | "[n] ..." justified, before/after 6 pt |

## Content rules

- **Equations:** numbered consecutively, number in parentheses flush right (right tab), equation
  centred (centre tab). In text cite only "(1)", not "Eq. (1)" or "equation (1)", except at the
  start of a sentence: "Equation (1) is ...".
- **Figures:** caption *below* the figure ("Figure 1: ..."). In text: "Fig. 1" or "Fig. (1)".
  Prefer placing figures/tables at the top or bottom of pages, not mid-page.
- **Tables:** head (caption) *above* the table ("Table 1. ..."), kept together with the table.
- **Alt text** mandatory for every figure, chart, diagram and non-decorative image: concise,
  sums up the key information not already in the text/caption. Logos/decorations are marked
  decorative. Tables need no alt text.
- **References:** numbered list "[n]" in citation order, cited in text as [n]:
  - Book: `[1] Author name, *Book title*, Publishing house, City, ISBN XXX-X-XXX-XXXXX-X, publishing year.`
  - Article: `[2] Author name, Author 2 name. *Article name,* Proceedings or Conference/Journal name, pages, ISBN or ISSN, City where the conference was, publishing year.`
- Paper ends with *Conclusions*, then Acknowledgment (optional), then References.
- Italics instead of underline.

## Visual check (compare the PNG previews with these)

Page 1: DOI line top-right; large title indented ~1 cm; italic author line with superscript
affiliation + ORCID; italic affiliation lines; black rule; small indented abstract block with
bold "Abstract"; "Keywords:" line; black rule; "1 Introduction" bold 16 pt; footer © line +
small CC BY paragraph. Pages 2+: two-line centred journal header with underline rule, no footer.
Tables: thin black grid, bold header, 10 pt caption centred above. Figures centred, 10 pt caption
below. References heading in Arial bold, entries 10 pt with [n].
