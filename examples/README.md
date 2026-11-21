# Examples

| Example                              | What it shows                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| [`cdn/module.html`](cdn/module.html) | ES module from jsDelivr; math and languages load on demand (recommended for CDN use) |
| [`cdn/script.html`](cdn/script.html) | One `<script>` tag, global `AxiomText`, saving HTML with a form                      |

Integrity (SRI) hashes for each release are in `dist/cdn/sri.json` of `axiomtext`, e.g.
`https://cdn.jsdelivr.net/npm/axiomtext@0.1.1/dist/cdn/sri.json`. Add them as `integrity="…"`
together with `crossorigin="anonymous"`.
