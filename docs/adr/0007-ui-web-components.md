# ADR-0007: UI as framework-free DOM components with CSS variables

## Status
Accepted (M0). Revised: originally "Lit Web Components"; changed after building the first toolbar.

## Context
The toolbar, dropdowns and status bar need to work in React, Vue, Angular, Svelte, plain HTML and inside the Flutter WebView.
Lit adds ~6 KB gzip and Shadow DOM, which makes theming and global content styles harder.

## Decision
UI components are plain TypeScript functions that build DOM (`createToolbar`, `createClassicEditor`, …) with `document.createElement` — never `innerHTML`.
Styling lives in one stylesheet (`@axiomtext/ui/styles.css`) driven by `--ax-*` CSS custom properties, with light/dark themes via `data-theme` and the OS preference.
Components only use the public editor API, so a headless mode is always possible. Custom-element wrappers (`<axiom-text>`) can be added later on top.

## Consequences
+ Zero framework dependency, small bundle, easy theming, XSS-safe UI.
+ Animations are CSS-only and disabled automatically with `prefers-reduced-motion`.
− Components update via explicit `update()` calls instead of reactive templates.
