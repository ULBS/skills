# IJASITELS source Markdown format

One UTF-8 file, `<name>.ijasitels.md`: YAML front matter + Pandoc Markdown body.
Image paths are relative to the file (absolute paths also work).
Complete example: `../assets/example.ijasitels.md`.

## Front matter

```yaml
---
title: "Specific Title of the Paper"          # Markdown inline allowed (*italic*)
authors:
  - name: Ana Popescu                         # "Given Family" as the authors want it printed
    affiliation: [1]                          # ids from `affiliations`; [1, 2] for several
    orcid: 0000-0001-2345-6789                # digits only (https://orcid.org/ prefix is stripped)
    email: ana.popescu@ulbsibiu.ro
    corresponding: true                       # optional, adds * to the superscript
  - name: Ion Ionescu
    affiliation: [1, 2]
    orcid: 0000-0002-3456-7890
    email: ion.ionescu@example.org
affiliations:                                 # list of strings (ids 1,2,...) or {id, text}
  - id: 1
    text: "Lucian Blaga University of Sibiu, Department of Computer Science and Electrical Engineering, Sibiu, Romania"
  - id: 2
    text: "Example Research Institute, Bucharest, Romania"
abstract: |                                   # <= 300 words; blank line = new paragraph
  Purpose ... methodology ... findings ... conclusions.
keywords: [one, two, three]                   # 3-5 (list or "a, b, c")
acknowledgment: |                             # optional
  The authors thank ...
journal:                                      # optional; defaults come from the template
  issue: "December 2026* Vol. XVI, no. 1"     # header on pages 2+
  doi: "10.xxxx/ijasitels-2026-0001"          # first-page header; empty -> "________________"
  year: 2026                                  # "© year Lucian Blaga University of Sibiu"
references:
  # Option A (recommended): keyed entries, cited in the body as [@key];
  # numbered [1], [2]... in order of first citation; uncited ones go last (+ warning).
  - id: friedman2001
    text: "J. H. Friedman, *Greedy Function Approximation: A Gradient Boosting Machine*, Annals of Statistics, 29(5), pp. 1189-1232, ISSN 0090-5364, 2001."
  # Option B: plain strings, numbered in the order given; cite as literal [1], [2] in the body.
  # - "T. Hastie, ... *The Elements of Statistical Learning*, Springer, New York, ISBN ..., 2009."
---
```

Do not mix A and B. Do not write "[n]" at the start of a reference text (it is stripped and
renumbered anyway).

Alternative: a `# References` (or `# Acknowledgment`) section at the end of the body, as a
numbered/bulleted list or one paragraph per entry, is also recognised and moved into the
right place - but front-matter references are preferred.

## Body

### Headings

```markdown
# Introduction            -> Heading1, numbered "1"
## Data                   -> Heading2, "2.1"
### Sampling              -> Heading3, "2.1.1"
#### Details              -> Heading4, "2.1.1.1"  (deeper levels are flattened to 4)
# Appendix A {.unnumbered}   -> no number
# Method {#sec:method}       -> cross-ref @sec:method -> "Section 2"
```

Never type numbers in headings - "2.1 Data" becomes "2.1 2.1 Data" (the builder strips the
common patterns, but write them clean).

### Paragraph text

`*italic*`, `**bold**`, `^sup^`, `~sub~`, `` `code` ``, `[text](https://url)`, inline math
`$x_i$`. Underline (`[x]{.underline}`) becomes italics. Line break: backslash at line end.
Page break: a line with only `\newpage`.

### Citations and cross-references

| Write | Rendered |
|---|---|
| `[@friedman2001]` | `[1]` |
| `[@friedman2001; @hastie2009]` | `[1], [2]` |
| `Friedman [@friedman2001] showed` | `Friedman [1] showed` |
| `@fig:auc` | `Fig. 1` |
| `@tbl:data` | `Table 1` |
| `@eq:loss` | `(1)` |
| `Equation @eq:loss` (sentence start) | `Equation (1)` |
| `@sec:method` | `Section 2` |

Avoid `[@fig:x]` (brackets) - use the bare `@fig:x`; `(@fig:x)` gives "(Fig. 1)".

### Figures

```markdown
![Caption text shown under the figure](media/chart.png){#fig:auc alt="Bar chart: AUC rises from 0.62 to 0.86." width=12cm}
```

- Must be alone in its paragraph (blank lines around it).
- Caption → "Figure n: Caption text", 10 pt, centred, below the image.
- `alt` = alt text (required; screen-reader description of the key information).
- `width`/`height`: cm, mm, in, px, pt or % of text width; default: natural size capped at
  the text width (14.66 cm) and 20 cm height.
- `decorative=true` marks a logo/decoration (no alt text needed).
- PNG/JPG/GIF used directly; SVG, EMF, WMF, PDF, BMP converted to PNG.

### Tables

```markdown
Table: Dataset summary {#tbl:data}

| Cohort | Students | Dropout rate |
|:-------|---------:|-------------:|
| 2021   | 1,590    | 18.2%        |
```

- Caption line (`Table: ...`) directly before or after the table → "Table n. caption" above it.
- Column alignment from the `:` markers; relative widths from the dash counts of the separator
  line when a row is longer than the line width (otherwise equal widths).
- Header row bold, repeats on page breaks. Merged cells: use a Pandoc grid table.
- Cell font: 12 pt up to 4 columns, else 10 pt (`--table-font-size N` overrides).

### Equations

```markdown
The model minimises

$$ L = \sum_{i=1}^{n} \ell(y_i, F(x_i)) + \lambda \Omega(F) $$ {#eq:loss}

where $\lambda$ ...
```

Display math (LaTeX) → Word equation, centred with tab stops, "(n)" flush right, style
`equation`. Numbered consecutively in order of appearance. `{#eq:id}` must follow `$$` on the
same line.

### Lists, quotes, code

Standard Markdown bullets (`-`), numbered lists (`1.`), nesting by indentation, `>` block
quotes (indented), fenced code blocks (Courier New 9 pt). Definition lists also work.

### Raw Word XML

`` ```{=openxml} ... ``` `` blocks are inserted verbatim (escape hatch, rarely needed).
