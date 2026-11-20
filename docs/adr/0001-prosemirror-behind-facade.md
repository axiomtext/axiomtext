# ADR-0001: Build on ProseMirror behind our own API

## Status
Accepted (M0)

## Context
Reliable contenteditable handling (selection, IME, clipboard, mobile keyboards) takes years to build. ProseMirror (MIT) is the most battle-tested foundation (used by Tiptap, Atlassian, NYT).

## Decision
Use ProseMirror for model, transforms, state and view. Public API (`@axiomtext/core`, `@axiomtext/view`) never exposes ProseMirror classes directly; plugin authors import engine types as aliases from `@axiomtext/core` (`NodeDefinition`, `EditorCommand`, …).

## Consequences
+ Years of edge cases solved on day one. + Can swap or fork the engine later.
− Bundle floor of ~55–65 KB gzip for the engine; core+view budget set to 70 KB (see ADR-0008).
