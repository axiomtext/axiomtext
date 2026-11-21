---
title: Security
description: How AxiomText keeps content safe.
---

- **Schema filtering.** Pasted or loaded content is reduced to what the editor understands. Scripts,
  event handlers, iframes, styles and unknown attributes never get in.
- **Links.** Only `http:`, `https:`, `mailto:` and `tel:` links are allowed; `javascript:` and
  similar are rejected.
- **Images.** Only raster image types; SVG data URLs (which can contain scripts) are refused.
- **Styles.** Colours, font sizes and font families are validated before reaching any `style`
  attribute.
- **Maths.** KaTeX runs with `trust: false` and limits on macro expansion.
- **No network calls.** The editor never fetches anything by itself: no fonts, no telemetry.

## Content Security Policy

AxiomText works with a strict CSP. A good starting point:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:
```

`'unsafe-inline'` for styles is needed for user-chosen colours and sizes; `data:`/`blob:` images
for pasted and uploaded images with the default base64 adapter.

## Trusted Types

On pages with `require-trusted-types-for 'script'`, allow AxiomText's policy and ProseMirror's:

```
trusted-types axiomtext ProseMirrorClipboard
```

Visual equation editing uses MathLive, which doesn't support Trusted Types yet; on such pages
equations are edited as LaTeX instead. Everything else works normally.

## Reporting a vulnerability

Please email security@axiomtext.dev rather than opening a public issue.
