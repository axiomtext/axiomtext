# ADR-0006: Flutter SDK hosts the web engine

## Status
Accepted (M0), implemented in M2

## Decision
The Flutter package hosts the same editor bundle in a WebView (mobile/desktop) or directly (Flutter Web), controlled through a typed, versioned message protocol generated from `packages/bridge-protocol`. A native read-only renderer displays stored JSON without a WebView.

## Consequences
+ Full feature parity with the web, including math, from one codebase. − WebView startup cost; mitigated with pre-warming and a budget of < 300 ms on mid-range Android.
