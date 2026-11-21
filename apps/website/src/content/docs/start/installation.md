---
title: Installation
description: Install AxiomText from npm or load it from a CDN.
---

## npm

AxiomText is one package with every feature:

```bash
npm install axiomtext
```

Then load the styles once in your app. This one file covers the toolbar, the content and the
equations:

```js
import 'axiomtext/styles.css';
```

Using React or Vue? Add the component package too:

```bash
npm install axiomtext @axiomtext/react   # or @axiomtext/vue
```

### Bundle size

Your bundler drops the features you don't use, and the heaviest parts (the visual math editor,
Markdown and interface languages) are only downloaded when they're first needed. To leave out
features on purpose, pass just the ones you want to `plugins`; see [Plugins](/reference/plugins/).

## CDN

No build step needed. See [CDN](/frameworks/cdn/).

## Browser support

The latest two versions of Chrome, Edge, Firefox and Safari, on desktop and mobile.
