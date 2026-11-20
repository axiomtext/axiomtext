# ADR-0005: Math editing with MathLive, KaTeX and MathJax

## Status
Accepted (M0), implemented in M1

## Decision
Equations are stored as LaTeX in `mathInline` / `mathBlock` nodes. MathLive (MIT) for visual editing and the virtual keyboard, KaTeX (MIT) for fast rendering, MathJax (Apache-2.0) lazy fallback for rare commands and speech output, Temml (MIT) for LaTeX→MathML. KaTeX runs with `trust: false` and macro expansion limits.

## Update (M1)
Editing is visual by default: clicking a rendered equation swaps it in place for a MathLive field, with the caret mapped to the click point. A floating bar offers rendered templates, symbols, Greek letters, the virtual keyboard and an optional LaTeX panel. MathLive reuses the KaTeX font families (`fontsDirectory = null`) so no fonts or sounds are fetched from the network. If MathLive fails to load, the LaTeX popover is used as a fallback.

## Consequences
+ All MIT/Apache, best-in-class quality. − Math code is heavy; it is lazy-loaded only when a document uses math.
