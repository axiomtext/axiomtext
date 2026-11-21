/**
 * @axiomtext/react — the AxiomText editor as a React component.
 *
 *   import { AxiomEditor } from '@axiomtext/react';
 *   import '@axiomtext/ui/styles.css';
 *   import 'katex/dist/katex.min.css';
 *
 *   <AxiomEditor defaultValue={saved} onChange={(doc) => save(doc)} />
 */
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties, ForwardedRef, ReactElement } from 'react';
import type { DocumentJSON } from '@axiomtext/core';
import {
  createBalloonEditor,
  createClassicEditor,
  createInlineEditor,
  type ClassicEditorOptions,
  type FloatingEditorOptions,
} from '@axiomtext/presets';
import type { Editor } from '@axiomtext/view';

type SharedOptions = Omit<ClassicEditorOptions, 'element' | 'content'> &
  Omit<FloatingEditorOptions, 'element' | 'content'>;

export interface AxiomEditorProps extends SharedOptions {
  /**
   * The document. When it changes to something other than what the editor shows, the editor
   * is updated (use it for "controlled" editing; `onChange` gives you every edit).
   */
  value?: DocumentJSON;
  /** Starting document for an uncontrolled editor. */
  defaultValue?: DocumentJSON;
  /** Called after every change with the new document. */
  onChange?: (value: DocumentJSON, editor: Editor) => void;
  /** Called once the editor exists (e.g. to keep a reference or run commands). */
  onReady?: (editor: Editor) => void;
  /** `classic` (default): toolbar + status bar. `inline` or `balloon`: floating toolbars. */
  type?: 'classic' | 'inline' | 'balloon';
  className?: string;
  style?: CSSProperties;
}

/** Handle returned through `ref`: the editor API (null before mount / after unmount). */
export interface AxiomEditorHandle {
  readonly editor: Editor | null;
}

const same = (a: DocumentJSON | undefined, b: DocumentJSON): boolean =>
  !!a && JSON.stringify(a.doc) === JSON.stringify(b.doc);

function AxiomEditorImpl(
  props: AxiomEditorProps,
  ref: ForwardedRef<AxiomEditorHandle>,
): ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  // Latest callbacks without re-creating the editor.
  const callbacks = useRef({ onChange: props.onChange, onReady: props.onReady });
  callbacks.current = { onChange: props.onChange, onReady: props.onReady };

  useImperativeHandle(ref, () => ({
    get editor() {
      return editorRef.current;
    },
  }));

  useEffect(() => {
    const element = host.current;
    if (!element) return undefined;
    const {
      value,
      defaultValue,
      onChange: _onChange,
      onReady: _onReady,
      type = 'classic',
      className: _className,
      style: _style,
      ...options
    } = props;
    const content = value ?? defaultValue;
    const config = { ...options, element, ...(content ? { content } : {}) };
    const instance =
      type === 'inline'
        ? createInlineEditor(config)
        : type === 'balloon'
          ? createBalloonEditor(config)
          : createClassicEditor(config);
    const editor = instance.editor;
    editorRef.current = editor;
    const off = editor.on('change', () => callbacks.current.onChange?.(editor.getJSON(), editor));
    callbacks.current.onReady?.(editor);
    return () => {
      off();
      instance.destroy();
      editorRef.current = null;
    };
    // The editor is created once per type; other option changes need a remount (key prop).
  }, [props.type]);

  // Controlled value: apply outside changes (not the ones the editor just reported).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !props.value) return;
    if (!same(props.value, editor.getJSON())) editor.setJSON(props.value);
  }, [props.value]);

  return createElement('div', {
    ref: host,
    className: ['axiomtext-react', props.className].filter(Boolean).join(' '),
    style: props.style,
  });
}

/** The AxiomText editor (classic by default) with every feature. */
export const AxiomEditor = forwardRef<AxiomEditorHandle, AxiomEditorProps>(AxiomEditorImpl);
AxiomEditor.displayName = 'AxiomEditor';

export type { DocumentJSON } from '@axiomtext/core';
export type { Editor } from '@axiomtext/view';
