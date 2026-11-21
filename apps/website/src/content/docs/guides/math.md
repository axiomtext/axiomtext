---
title: Math
description: Inline and block equations, visual editing, LaTeX, AsciiMath and paste.
---

## Adding equations

| How | Result |
|---|---|
| Toolbar **Σ** or <kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> | Inline equation |
| More → **Block equation** or <kbd>Ctrl/⌘</kbd>+<kbd>Alt</kbd>+<kbd>M</kbd> | Block (display) equation |
| Type `$x^2$` | Inline equation |
| Type `\(x^2\)` | Inline equation |
| Type `$$` + space, or `\[x^2\]` on its own line | Block equation |
| Paste text with `$…$`, `$$…$$`, `\(…\)`, `\[…\]` | Equations |
| Paste from Wikipedia, ChatGPT, MathJax/KaTeX pages, or any app that copies MathML | Equations |

## Editing visually

Click any part of an equation, a number, an exponent or a fraction bar, and type. The cursor lands
where you click. Use the arrow keys or <kbd>Tab</kbd> to move between parts, and **Enter** to finish.
The equation bar offers structures (fractions, roots, sums, matrices…), symbols and Greek letters,
and a math keyboard for touch screens.

## LaTeX and AsciiMath

Choose **LaTeX** in the equation bar to type LaTeX directly. Type `\` and a few letters for
suggestions (`\fr` → `\frac{}{}`), then <kbd>Tab</kbd> or <kbd>Enter</kbd> to accept.

Switch to **AsciiMath** to type simpler notation such as `sqrt(a+b)/2` or `sum_(i=1)^n i^2`;
it is converted to LaTeX for you.

## What is supported

Algebra, calculus, matrices (`pmatrix`, `bmatrix`, `vmatrix`…), cases, aligned equations, vectors,
sets and logic, statistics, trigonometry, accents and fonts. Every release is tested against a
corpus of 500 equations.

## Saved format

Equations are stored as LaTeX in the JSON (`{"type":"math_inline","attrs":{"latex":"x^2"}}`).
`getHTML()` includes the rendered equation with MathML for screen readers, so your website needs no
JavaScript to show it, only `katex.min.css`.

## Performance

KaTeX (rendering) loads only when a document contains an equation, and MathLive (visual editing)
only when someone edits one.
