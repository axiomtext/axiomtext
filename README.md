# AxiomText

**A free, open-source rich text editor with a built-in visual math editor.**

- **Free forever, MIT licensed.** Commercial use included. No license key, no editor-load limits.
- **Real math editing.** Click any part of an equation and type. LaTeX with autocomplete, AsciiMath,
  palettes, a math keyboard, and paste from Wikipedia, ChatGPT and other MathML sources.
- **Everything you expect.** Text styles, fonts, colours, headings, lists and to-dos, tables, images
  with text wrapping (including text on both sides), links, columns, Markdown, autosave.
- **Runs in the browser.** No server needed; your documents never leave your app.
- **For every stack.** Vanilla JS, React, Vue or a CDN `<script>`; classic, inline and balloon editors.
- **Global text.** 10 interface languages, right-to-left support, tested input methods for Japanese
  and Bangla.

> **Status: v0.1 alpha (M1).** Feature-complete for everyday editing and maths. The API may still
> change before 1.0. Docs and live demo: [axiomtext.dev](https://axiomtext.dev).

## Install

```bash
npm install @axiomtext/presets katex
```

```js
import { createClassicEditor } from '@axiomtext/presets';
import '@axiomtext/ui/styles.css';
import 'katex/dist/katex.min.css';

const { editor } = createClassicEditor({
  element: document.querySelector('#editor'),
  placeholder: 'Start writing…',
});
editor.on('change', () => save(editor.getJSON()));
```

React: `npm install @axiomtext/react` → `<AxiomEditor onChange={…} />`.
Vue: `npm install @axiomtext/vue` → `<AxiomEditor v-model="doc" />`.
No build step: see [`examples/cdn`](examples/cdn).

To show saved HTML on your website exactly as in the editor, load `@axiomtext/ui/content.css`
and `katex.min.css`, and wrap it in `<div class="axiomtext-content">`.

## Packages

| Package                              |                                                                     |
| ------------------------------------ | ------------------------------------------------------------------- |
| `@axiomtext/presets`                 | Ready-made editors with every feature; CDN builds                   |
| `@axiomtext/react`, `@axiomtext/vue` | Framework components                                                |
| `@axiomtext/ui`                      | Toolbars, dialogs, styles, translations (`@axiomtext/ui/locales/*`) |
| `@axiomtext/view`                    | Headless editor (build your own UI)                                 |
| `@axiomtext/core`                    | Document format, schema, plugin system                              |
| `@axiomtext/math`                    | Equations                                                           |
| `@axiomtext/convert`                 | Markdown import/export                                              |
| `@axiomtext/plugin-*`                | One package per feature                                             |
| `@axiomtext/i18n`                    | Translation runtime                                                 |

## Development

Requirements: Node.js 22 (see `.nvmrc`) and pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev          # playground at http://localhost:5173 (?lang=bn, ?mode=balloon, ?autosave)
pnpm check        # format, lint, typecheck, unit tests, bundle size, licenses
pnpm test:e2e     # Playwright (first run: pnpm exec playwright install)
pnpm bench        # performance (after pnpm build)
pnpm --filter @axiomtext/website dev   # docs site
```

```
apps/playground/     Every feature, used for development and e2e tests
apps/website/        axiomtext.dev: docs, demo (Astro Starlight)
packages/            core, view, ui, math, convert, i18n, presets, react, vue, plugins/*
e2e/                 Cross-browser end-to-end tests (incl. accessibility, IME, Trusted Types)
benchmarks/          Load and typing performance
corpora/             Test collections: 500 equations, paste samples
docs/                Architecture decisions (ADRs) and progress
examples/            CDN usage
```

## Roadmap

- **M1 — v0.1 alpha (this release):** core editing, math, React/Vue, CDN, docs site.
- **M2 — v0.5 beta:** advanced tables, paste from Word/Excel, find & replace, mentions, slash menu,
  code blocks, media embeds, Angular/Svelte, **Flutter SDK beta**.
- **M3 — v1.0:** pagination and page setup, footnotes, table of contents, **DOCX import/export**,
  PDF export, equation numbering.

## Contributing & security

See [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately as described in
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © AxiomText contributors
