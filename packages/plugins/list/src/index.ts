import { definePlugin } from '@axiomtext/core';
import type { EditorCommand, NodeDefinition } from '@axiomtext/core';
import { chainCommands } from 'prosemirror-commands';
import { inputRules, wrappingInputRule } from 'prosemirror-inputrules';
import type { Node as PMNode, NodeType } from 'prosemirror-model';
import { liftListItem, sinkListItem, splitListItem, wrapInList } from 'prosemirror-schema-list';
import { Plugin } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';
import type { EditorView, NodeView } from 'prosemirror-view';

const LIST_TYPES = ['bullet_list', 'ordered_list', 'task_list'] as const;
type ListTypeName = (typeof LIST_TYPES)[number];

const nodes: Record<string, NodeDefinition> = {
  bullet_list: {
    content: 'list_item+',
    group: 'block list',
    parseDOM: [{ tag: 'ul:not([data-type="task-list"])' }],
    toDOM: () => ['ul', 0],
  },
  ordered_list: {
    content: 'list_item+',
    group: 'block list',
    attrs: { start: { default: 1, validate: 'number' } },
    parseDOM: [
      {
        tag: 'ol',
        getAttrs: (dom) => {
          const start = (dom as HTMLElement).getAttribute('start');
          return { start: start ? Number.parseInt(start, 10) || 1 : 1 };
        },
      },
    ],
    toDOM: (node) =>
      node.attrs['start'] === 1 ? ['ol', 0] : ['ol', { start: String(node.attrs['start']) }, 0],
  },
  list_item: {
    content: 'paragraph block*',
    defining: true,
    parseDOM: [{ tag: 'li:not([data-type="task-item"])' }],
    toDOM: () => ['li', 0],
  },
  task_list: {
    content: 'task_item+',
    group: 'block list',
    parseDOM: [{ tag: 'ul[data-type="task-list"]', priority: 60 }],
    toDOM: () => ['ul', { 'data-type': 'task-list', class: 'ax-task-list' }, 0],
  },
  task_item: {
    content: 'paragraph block*',
    defining: true,
    attrs: { checked: { default: false, validate: 'boolean' } },
    parseDOM: [
      {
        tag: 'li[data-type="task-item"]',
        priority: 60,
        getAttrs: (dom) => ({
          checked: (dom as HTMLElement).getAttribute('data-checked') === 'true',
        }),
      },
    ],
    toDOM: (node) => [
      'li',
      {
        'data-type': 'task-item',
        'data-checked': String(node.attrs['checked']),
        class: 'ax-task-item',
      },
      [
        'input',
        {
          type: 'checkbox',
          disabled: 'true',
          ...(node.attrs['checked'] ? { checked: 'true' } : {}),
        },
      ],
      ['div', 0],
    ],
  },
};

const itemTypeFor = (state: EditorState, list: ListTypeName): NodeType | undefined =>
  state.schema.nodes[list === 'task_list' ? 'task_item' : 'list_item'];

/** Finds the innermost list around the selection. */
function findParentList(state: EditorState): { node: PMNode; pos: number } | null {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if ((LIST_TYPES as readonly string[]).includes(node.type.name)) {
      return { node, pos: $from.before(depth) };
    }
  }
  return null;
}

/** Toggles a list type: wraps, unwraps, or converts between bulleted and numbered lists. */
function toggleList(listName: ListTypeName): () => EditorCommand {
  return () => (state, dispatch, view) => {
    const listType = state.schema.nodes[listName];
    const itemType = itemTypeFor(state, listName);
    if (!listType || !itemType) return false;
    const parent = findParentList(state);

    if (parent && parent.node.type === listType) {
      return liftListItem(itemType)(state, dispatch, view);
    }
    if (parent && parent.node.type !== listType) {
      const sameItems = parent.node.type.contentMatch.defaultType === itemType;
      if (sameItems) {
        // bullet ↔ numbered: just change the list node.
        dispatch?.(state.tr.setNodeMarkup(parent.pos, listType).scrollIntoView());
        return true;
      }
      // to/from task list: unwrap first, then wrap with the new type.
      const oldItem = parent.node.type.contentMatch.defaultType;
      if (!oldItem) return false;
      let lifted: EditorState | null = null;
      liftListItem(oldItem)(state, (tr) => (lifted = state.apply(tr)));
      if (!lifted) return false;
      const afterLift: EditorState = lifted;
      return wrapInList(listType)(afterLift, (tr2) => {
        if (!dispatch) return;
        // Re-base the second step onto the original state as one transaction.
        const tr = state.tr;
        liftListItem(oldItem)(state, (t) => {
          for (const step of t.steps) tr.step(step);
        });
        for (const step of tr2.steps) tr.step(step);
        dispatch(tr.scrollIntoView());
      });
    }
    return wrapInList(listType)(state, dispatch, view);
  };
}

export const toggleBulletList = toggleList('bullet_list');
export const toggleOrderedList = toggleList('ordered_list');
export const toggleTaskList = toggleList('task_list');

const anyItem =
  (fn: (type: NodeType) => EditorCommand): EditorCommand =>
  (state, dispatch, view) => {
    for (const name of ['list_item', 'task_item']) {
      const type = state.schema.nodes[name];
      if (type && fn(type)(state, dispatch, view)) return true;
    }
    return false;
  };

/** Nest the current list item one level deeper (Tab). */
export const indentListItem = (): EditorCommand => anyItem((t) => sinkListItem(t));
/** Move the current list item one level up (Shift+Tab). */
export const outdentListItem = (): EditorCommand => anyItem((t) => liftListItem(t));

/** Checkbox UI for to-do items; clicking toggles `checked` as an undoable change. */
class TaskItemView implements NodeView {
  dom: HTMLLIElement;
  contentDOM: HTMLDivElement;
  private checkbox: HTMLInputElement;

  constructor(
    private node: PMNode,
    view: EditorView,
    getPos: () => number | undefined,
  ) {
    this.dom = document.createElement('li');
    this.dom.className = 'ax-task-item';
    this.dom.dataset['type'] = 'task-item';
    const label = document.createElement('label');
    label.contentEditable = 'false';
    label.className = 'ax-task-item__check';
    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.setAttribute('aria-label', 'Done');
    this.checkbox.addEventListener('mousedown', (e) => e.preventDefault());
    this.checkbox.addEventListener('change', () => {
      const pos = getPos();
      if (pos === undefined || !view.editable) {
        this.checkbox.checked = this.node.attrs['checked'] as boolean;
        return;
      }
      view.dispatch(
        view.state.tr.setNodeMarkup(pos, undefined, {
          ...this.node.attrs,
          checked: this.checkbox.checked,
        }),
      );
    });
    label.append(this.checkbox);
    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'ax-task-item__content';
    this.dom.append(label, this.contentDOM);
    this.sync();
  }

  private sync(): void {
    const checked = this.node.attrs['checked'] === true;
    this.checkbox.checked = checked;
    this.dom.dataset['checked'] = String(checked);
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.sync();
    return true;
  }

  ignoreMutation(mutation: MutationRecord | { type: 'selection'; target: Node }): boolean {
    return mutation.type !== 'selection' && !this.contentDOM.contains(mutation.target);
  }
}

/** LST-001, LST-002, CORE-008 (list indent) and markdown shortcuts `- `, `1. `, `[ ] `. */
export const List = definePlugin({
  name: 'list',
  nodes,
  commands: {
    toggleBulletList,
    toggleOrderedList,
    toggleTaskList,
    indentListItem,
    outdentListItem,
  },
  keymap: (schema) => {
    const split: EditorCommand[] = [];
    const listItem = schema.nodes['list_item'];
    const taskItem = schema.nodes['task_item'];
    if (listItem) split.push(splitListItem(listItem));
    if (taskItem) split.push(splitListItem(taskItem, { checked: false }));
    return {
      Enter: chainCommands(...split),
      Tab: indentListItem(),
      'Shift-Tab': outdentListItem(),
      'Mod-Shift-8': toggleBulletList(),
      'Mod-Shift-7': toggleOrderedList(),
      'Mod-Shift-9': toggleTaskList(),
    };
  },
  enginePlugins: (schema) => {
    const { bullet_list: bullet, ordered_list: ordered, task_list: task } = schema.nodes;
    const rules = [];
    if (bullet) rules.push(wrappingInputRule(/^\s*([-+*])\s$/, bullet));
    if (ordered) {
      rules.push(
        wrappingInputRule(
          /^(\d+)\.\s$/,
          ordered,
          (m) => ({ start: Number(m[1]) || 1 }),
          (m, node) => node.childCount + (node.attrs['start'] as number) === Number(m[1]),
        ),
      );
    }
    if (task) rules.push(wrappingInputRule(/^\[( |x)?\]\s$/i, task));
    return [
      inputRules({ rules }),
      new Plugin({
        props: {
          nodeViews: {
            task_item: (node, view, getPos) => new TaskItemView(node, view, getPos),
          },
        },
      }),
    ];
  },
  messages: {
    en: {
      'list.bulleted': 'Bulleted list',
      'list.numbered': 'Numbered list',
      'list.todo': 'To-do list',
      'list.indent': 'Increase indent',
      'list.outdent': 'Decrease indent',
    },
  },
});
