import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement, createRef, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { DocumentJSON } from '@axiomtext/core';
import { AxiomEditor } from '../src';
import type { AxiomEditorHandle } from '../src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const doc = (text: string): DocumentJSON => ({
  version: 1,
  doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
});

let root: Root | undefined;
let container: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

const render = (element: Parameters<Root['render']>[0]): HTMLElement => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(element));
  return container;
};

describe('<AxiomEditor>', () => {
  it('renders the classic editor with content and reports changes', () => {
    const changes: DocumentJSON[] = [];
    const ref = createRef<AxiomEditorHandle>();
    const el = render(
      createElement(AxiomEditor, {
        ref,
        defaultValue: doc('Hello React'),
        onChange: (value) => changes.push(value),
      }),
    );
    expect(el.querySelector('.ax-toolbar')).not.toBeNull();
    expect(el.querySelector('.ProseMirror')?.textContent).toBe('Hello React');
    act(() => {
      ref.current?.editor?.focus('end');
      ref.current?.editor?.insertText(' and more');
    });
    expect(changes.at(-1)?.doc.content?.[0]?.content?.[0]?.text).toBe('Hello React and more');
  });

  it('follows the value prop (controlled) and survives StrictMode', () => {
    const ref = createRef<AxiomEditorHandle>();
    const el = render(
      createElement(StrictMode, null, createElement(AxiomEditor, { ref, value: doc('one') })),
    );
    expect(el.querySelectorAll('.ax-editor')).toHaveLength(1); // no double editor
    act(() =>
      root?.render(
        createElement(StrictMode, null, createElement(AxiomEditor, { ref, value: doc('two') })),
      ),
    );
    expect(ref.current?.editor?.getText()).toBe('two');
  });

  it('cleans up on unmount', () => {
    render(createElement(AxiomEditor, { type: 'balloon' }));
    expect(document.querySelector('.ax-floating-toolbar')).not.toBeNull();
    act(() => root?.unmount());
    root = undefined;
    expect(document.querySelector('.ax-floating-toolbar')).toBeNull();
  });
});
