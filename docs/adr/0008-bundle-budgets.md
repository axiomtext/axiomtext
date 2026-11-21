# ADR-0008: Bundle size budgets

## Status
Accepted (M0)

## Context
The planning docs targeted ≤ 60 KB gzip for core + view. Measured in M0: 64.5 KB, of which ~55 KB is the ProseMirror engine itself.

## Decision
Budgets enforced by size-limit in CI: `@axiomtext/core` ≤ 40 KB, core + view (incl. engine) ≤ 70 KB, classic preset ≤ 180 KB. Any increase needs a PR explaining why.

## Update (M1 batch 2)
The classic editor UI (toolbar with menus, colour picker, table grid, image and table bars, link and math UIs) measures ~80 KB including the ~68 KB engine. Budget for `@axiomtext/ui` set to 85 KB. Feature plugins and KaTeX/MathLive are not included and stay lazy or opt-in.

## Update (M1 complete)
- `@axiomtext/math` budget 10 → 14 KB. Added: MathML → LaTeX conversion (must be synchronous: it runs while
  pasted HTML is parsed, for Wikipedia/ChatGPT/MathJax/Word content), `$…$` paste and `\(…\)` triggers,
  the AsciiMath bridge and translated UI text. The LaTeX autocomplete command list is a separate chunk
  loaded when a LaTeX field opens; size-limit counts it anyway, so the real first-load cost is ~11 KB.
- `@axiomtext/ui` stays within 85 KB (83.5 KB) after adding the shortcut dialog, autosave status,
  inline/balloon editors and i18n. UI translations ship as separate entry points
  (`@axiomtext/ui/locales/<lang>`, ~4 KB gzip each) so apps only load the languages they use.
- Markdown import/export (`@axiomtext/convert`, markdown-it) is opt-in and not part of any editor bundle.

## Consequences
Still competitive with CKEditor 5 and TinyMCE builds; heavy features (math, code highlighting, conversion) stay lazy-loaded.

## Update (M2, Flutter SDK)

Math budget raised from 14 KB to 15 KB (gzip). The plugin now converts maths written with
delimiters inside pasted HTML (`\(…\)` from ChatGPT and similar sites) into equations, and lets an
embedding app drive equation editing with its own keyboard (`setMathInputHost`, used by the
Flutter SDK) and supply its own MathLive loader (`setMathLiveLoader`). Together these added
about 0.4 KB.

## Update (comments and readers' highlights)

UI budget raised from 85 KB to 94 KB (gzip). size-limit counts code loaded on demand: the
comments UI (about 3 KB) and the reader view for read-only editors (about 4.5 KB) are separate
chunks that download only when an editor is created with `comments` or `highlights`. What every
editor loads up front grew by about 1 KB (the Comment buttons and their icons). The website
viewer, `axiomtext/viewer`, is about 5 KB on its own and doesn't load the editor.

## Update (any highlight colour, redesigned comments UI)

UI budget raised from 94 KB to 97 KB (gzip). The growth (about 1.9 KB) is the shared colour
picker (presets, palette, hex and system picker, background switch, preview) and the redesigned
thread and panel code. It's all in the on-demand comments and reader chunks; what every editor
loads up front is unchanged. The new styles are CSS, outside this budget.
