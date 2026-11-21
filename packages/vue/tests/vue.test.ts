import { afterEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import type { App } from 'vue';
import type { DocumentJSON } from 'axiomtext';
import type { Editor } from 'axiomtext';
import { AxiomEditor } from '../src';

const doc = (text: string): DocumentJSON => ({
  version: 1,
  doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
});

let app: App | undefined;
let el: HTMLElement | undefined;
afterEach(() => {
  app?.unmount();
  el?.remove();
});

describe('<AxiomEditor> (Vue)', () => {
  it('supports v-model both ways', async () => {
    const model = ref<DocumentJSON>(doc('Hello Vue'));
    let editor: Editor | undefined;
    el = document.createElement('div');
    document.body.append(el);
    app = createApp(
      defineComponent({
        setup: () => () =>
          h(AxiomEditor, {
            modelValue: model.value,
            'onUpdate:modelValue': (v: DocumentJSON) => (model.value = v),
            onReady: (e: Editor) => (editor = e),
          }),
      }),
    );
    app.mount(el);
    await nextTick();
    expect(el.querySelector('.ProseMirror')?.textContent).toBe('Hello Vue');
    editor?.focus('end');
    editor?.insertText('!');
    expect(model.value.doc.content?.[0]?.content?.[0]?.text).toBe('Hello Vue!');
    model.value = doc('Replaced');
    await nextTick();
    expect(editor?.getText()).toBe('Replaced');
  });

  it('removes floating toolbars on unmount', async () => {
    el = document.createElement('div');
    document.body.append(el);
    app = createApp(defineComponent({ setup: () => () => h(AxiomEditor, { type: 'balloon' }) }));
    app.mount(el);
    await nextTick();
    expect(document.querySelector('.ax-floating-toolbar')).not.toBeNull();
    app.unmount();
    app = undefined;
    expect(document.querySelector('.ax-floating-toolbar')).toBeNull();
  });
});
