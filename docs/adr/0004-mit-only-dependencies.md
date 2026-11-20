# ADR-0004: MIT license and permissive dependencies only

## Status
Accepted (M0)

## Decision
AxiomText is MIT. Production dependencies must be MIT, Apache-2.0, BSD, ISC or MPL-2.0. `scripts/check-licenses.mjs` fails CI on GPL/AGPL/LGPL/SSPL/BUSL. No code copied from GPL or commercial editors.

## Consequences
+ Companies can adopt AxiomText without legal review friction. − Some libraries are off-limits.
