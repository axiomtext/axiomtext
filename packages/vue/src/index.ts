/**
 * @axiomtext/vue — the AxiomText editor as a Vue 3 component with v-model.
 *
 *   <script setup>
 *   import { AxiomEditor } from '@axiomtext/vue';
 *   import 'axiomtext/styles.css';
 *   const doc = ref(saved);
 *   </script>
 *   <template><AxiomEditor v-model="doc" language="bn" /></template>
 */
import { defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { PropType } from 'vue';
import {
  createBalloonEditor,
  createClassicEditor,
  createInlineEditor,
  type ClassicEditorOptions,
  type FloatingEditorOptions,
  type Editor,
  type AxiomPlugin,
  type DocumentJSON,
} from 'axiomtext';

type Options = Omit<ClassicEditorOptions, 'element' | 'content'> &
  Omit<FloatingEditorOptions, 'element' | 'content'>;

const same = (a: DocumentJSON | undefined, b: DocumentJSON): boolean =>
  !!a && JSON.stringify(a.doc) === JSON.stringify(b.doc);

export const AxiomEditor = defineComponent({
  name: 'AxiomEditor',
  props: {
    /** The document (v-model). */
    modelValue: { type: Object as PropType<DocumentJSON>, default: undefined },
    /** `classic` (default), `inline` or `balloon`. */
    type: { type: String as PropType<'classic' | 'inline' | 'balloon'>, default: 'classic' },
    plugins: { type: Array as PropType<readonly AxiomPlugin[]>, default: undefined },
    placeholder: { type: String, default: undefined },
    language: { type: String, default: undefined },
    translations: { type: Object as PropType<Record<string, string>>, default: undefined },
    editable: { type: Boolean, default: true },
    /** Any other editor option (toolbar, autosave, icons, …). */
    options: { type: Object as PropType<Partial<Options>>, default: () => ({}) },
  },
  emits: {
    'update:modelValue': (_value: DocumentJSON) => true,
    ready: (_editor: Editor) => true,
  },
  setup(props, { emit, expose }) {
    const host = ref<HTMLElement>();
    const editor = shallowRef<Editor | null>(null);
    let destroy: (() => void) | null = null;

    const mount = (): void => {
      if (!host.value) return;
      const config = {
        ...props.options,
        element: host.value,
        editable: props.editable,
        ...(props.plugins ? { plugins: props.plugins } : {}),
        ...(props.placeholder ? { placeholder: props.placeholder } : {}),
        ...(props.language ? { language: props.language } : {}),
        ...(props.translations ? { translations: props.translations } : {}),
        ...(props.modelValue ? { content: props.modelValue } : {}),
      };
      const instance =
        props.type === 'inline'
          ? createInlineEditor(config)
          : props.type === 'balloon'
            ? createBalloonEditor(config)
            : createClassicEditor(config);
      const current = instance.editor;
      const off = current.on('change', () => emit('update:modelValue', current.getJSON()));
      editor.value = current;
      destroy = () => {
        off();
        instance.destroy();
        editor.value = null;
      };
      emit('ready', current);
    };

    onMounted(mount);
    onBeforeUnmount(() => destroy?.());
    watch(
      () => props.modelValue,
      (value) => {
        if (value && editor.value && !same(value, editor.value.getJSON()))
          editor.value.setJSON(value);
      },
    );
    watch(
      () => props.editable,
      (value) => editor.value?.setEditable(value),
    );
    watch(
      () => props.type,
      () => {
        destroy?.();
        mount();
      },
    );

    expose({ editor });
    return () => h('div', { ref: host, class: 'axiomtext-vue' });
  },
});

export default AxiomEditor;
export type { DocumentJSON, Editor } from 'axiomtext';
