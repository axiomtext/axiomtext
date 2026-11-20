# ADR-0007: UI as Web Components with CSS variables

## Status
Accepted (M0), implemented in M1

## Decision
Toolbar, balloons, dialogs and menus are Lit Web Components themed with CSS custom properties (`--ax-*`). The UI only uses the public editor API, so a headless mode is always possible.

## Consequences
+ Works in every framework. + Theming without rebuilding. − Framework wrappers must bridge events/props.
