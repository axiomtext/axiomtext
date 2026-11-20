# ADR-0005: Math editing with MathLive, KaTeX and MathJax

## Status
Accepted (M0), implemented in M1

## Decision
Equations are stored as LaTeX in `mathInline` / `mathBlock` nodes. MathLive (MIT) for visual editing and the virtual keyboard, KaTeX (MIT) for fast rendering, MathJax (Apache-2.0) lazy fallback for rare commands and speech output, Temml (MIT) for LaTeX→MathML. KaTeX runs with `trust: false` and macro expansion limits.

## Consequences
+ All MIT/Apache, best-in-class quality. − Math code is heavy; it is lazy-loaded only when a document uses math.
