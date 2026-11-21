# Benchmarks

`pnpm build && pnpm bench` measures, in Chromium:

- loading 200 and 1000 paragraph documents (with formatting and equations),
- typing in a 1000-paragraph document: processing time per key press (until the editor has
  inserted the text and updated its DOM; painting excluded),
- HTML export time.

The M1 gate is **processing per key press p95 < 16 ms** (leaves the rest of the frame for painting). Results are written to
`benchmarks/results.json`. Numbers depend on the machine; compare runs on the same hardware.
