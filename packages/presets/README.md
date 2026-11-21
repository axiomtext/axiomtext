# @axiomtext/presets

Ready-made [AxiomText](https://axiomtext.dev) editors with every free feature: classic, inline and
balloon. Also contains the CDN builds (`dist/cdn/`).

```js
import { createClassicEditor } from '@axiomtext/presets';
import '@axiomtext/ui/styles.css';
import 'katex/dist/katex.min.css';

const { editor } = createClassicEditor({ element: document.querySelector('#editor') });
```

CDN: `https://cdn.jsdelivr.net/npm/@axiomtext/presets/dist/cdn/axiomtext.js` (ES module) or
`axiomtext.iife.js` (global `AxiomText`), with `axiomtext.css` and `katex/katex.min.css`. Integrity
hashes: `dist/cdn/sri.json`. Docs: https://axiomtext.dev/frameworks/cdn/
