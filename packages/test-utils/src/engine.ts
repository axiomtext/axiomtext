import { buildSchema } from '@axiomtext/core';
import type { AxiomPlugin } from '@axiomtext/core';
import { keymap } from 'prosemirror-keymap';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

export interface TestView {
  view: EditorView;
  /** Types text character by character, running input rules like a real keyboard. */
  type(text: string): void;
  /** Runs a key binding from the plugins' keymaps, e.g. `press('Enter')`. */
  press(key: string): boolean;
  /** Selects a range of the document. */
  select(from: number, to?: number): void;
  html(): string;
  destroy(): void;
}

/** Low-level engine harness for plugin tests (input rules, keymaps, node views). */
export function createTestView(
  plugins: readonly AxiomPlugin[],
  config?: Readonly<Record<string, unknown>>,
): TestView {
  const schema = buildSchema(plugins, config);
  const keymaps = plugins.flatMap((p) => (p.keymap ? [p.keymap(schema)] : []));
  const state = EditorState.create({
    schema,
    plugins: [
      ...plugins.flatMap((p) => p.enginePlugins?.(schema) ?? []),
      ...keymaps.map((k) => keymap(k)),
    ],
  });
  const place = document.createElement('div');
  document.body.appendChild(place);
  const view = new EditorView(place, { state });

  return {
    view,
    type(text) {
      for (const ch of text) {
        const { from, to } = view.state.selection;
        const handled = view.someProp('handleTextInput', (f) =>
          f(view, from, to, ch, () => view.state.tr.insertText(ch, from, to)),
        );
        if (!handled) view.dispatch(view.state.tr.insertText(ch, from, to));
      }
    },
    press(key) {
      for (const map of keymaps) {
        const cmd = map[key];
        if (cmd && cmd(view.state, view.dispatch, view)) return true;
      }
      return false;
    },
    select(from, to = from) {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
    },
    html() {
      return view.dom.innerHTML;
    },
    destroy() {
      view.destroy();
      place.remove();
    },
  };
}
