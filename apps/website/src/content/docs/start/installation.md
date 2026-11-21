---
title: Installation
description: Install AxiomText from npm or load it from a CDN.
---

## npm

The easiest way to start is the presets package, which includes every feature:

```bash
npm install @axiomtext/presets katex
```

Then load the styles once in your app:

```js
import '@axiomtext/ui/styles.css';
import 'katex/dist/katex.min.css';
```

Using a framework? Install [`@axiomtext/react`](/frameworks/react/) or
[`@axiomtext/vue`](/frameworks/vue/) instead; they include the presets.

### Choosing features

To keep your bundle small, build the editor from individual packages instead:

```bash
npm install @axiomtext/ui @axiomtext/plugin-basic-styles @axiomtext/plugin-heading @axiomtext/plugin-list
```

See [Plugins](/reference/plugins/) for the full list.

## CDN

No build step needed. See [CDN](/frameworks/cdn/).

## Browser support

The latest two versions of Chrome, Edge, Firefox and Safari, on desktop and mobile.
