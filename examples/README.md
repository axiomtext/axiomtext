# Examples

| Example                              | What it shows                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| [`cdn/module.html`](cdn/module.html) | ES module from jsDelivr; math and languages load on demand (recommended for CDN use) |
| [`cdn/script.html`](cdn/script.html) | One `<script>` tag, global `AxiomText`, saving HTML with a form                      |

Integrity (SRI) hashes for each release are in `dist/cdn/sri.json` of `@axiomtext/presets`, e.g.
`https://cdn.jsdelivr.net/npm/@axiomtext/presets@0.1.0/dist/cdn/sri.json`. Add them as `integrity="…"`
together with `crossorigin="anonymous"`.
