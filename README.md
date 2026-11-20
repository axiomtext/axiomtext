# AxiomText

**A free, open-source rich text editor with a built-in math equation editor** — for the web and Flutter.

- **Free forever, MIT licensed** — commercial use included. No license key, no editor-load limits.
- **Everything the big editors do** — formatting, tables, media, paste from Word, page layout, Word & PDF export.
- **Real math editing** — LaTeX, visual editor, symbol palettes, virtual keyboard, Word equations.
- **Runs in the browser** — no server needed; your documents never leave your app.
- **Every platform** — React, Vue, Angular, Svelte, vanilla JS and an official Flutter SDK.
- **Global text** — right-to-left, Bangla, Arabic, CJK and other complex scripts as first-class citizens.

> 🚧 **Status: M0 (foundation).** Not ready for production yet. Follow progress at [axiomtext.dev](https://axiomtext.dev).

## Quick start (development)

Requirements: Node.js 22 (see `.nvmrc`) and pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev          # playground at http://localhost:5173
pnpm check        # format, lint, typecheck, unit tests, bundle size, licenses
pnpm test:e2e     # Playwright (first run: pnpm exec playwright install)
```

## Repository layout

```
apps/playground/        Vite app with every feature, used for development and e2e tests
packages/core/          Document format, schema, plugin system (no DOM)
packages/view/          Editable view: rendering, input, history
packages/plugins/*      One package per feature (basic-styles, heading, …)
packages/i18n/          Translations and RTL detection
packages/math/          Math equation editor (M1)
packages/ui/            Toolbar and UI components (M1)
packages/react|vue|…    Framework integrations
packages/flutter/       Flutter SDK (Dart package)
e2e/                    Cross-browser end-to-end tests
corpora/                Test collections: equations, paste samples, DOCX files
docs/                   Architecture, decisions (ADRs), plans
```

## Usage preview

```ts
import { createEditor } from '@axiomtext/view';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { Heading } from '@axiomtext/plugin-heading';

const editor = createEditor({
  element: document.querySelector('#editor')!,
  plugins: [BasicStyles, Heading],
  placeholder: 'Start writing…',
});

editor.execute('toggleBold');
editor.execute('setHeading', 2);
const json = editor.getJSON(); // store this
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Sakibul Haque and AxiomText contributors.
