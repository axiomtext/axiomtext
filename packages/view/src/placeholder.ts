import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

/** Shows placeholder text while the document is a single empty paragraph (CORE-023). */
export function placeholderPlugin(text: string): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        const { doc } = state;
        const first = doc.firstChild;
        const isEmpty =
          doc.childCount === 1 && first !== null && first.isTextblock && first.content.size === 0;
        if (!isEmpty) return null;
        return DecorationSet.create(doc, [
          Decoration.node(0, first.nodeSize, {
            class: 'axiomtext-placeholder',
            'data-placeholder': text,
          }),
        ]);
      },
    },
  });
}
