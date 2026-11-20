import { definePlugin, sanitizeColor } from '@axiomtext/core';
import type { EditorCommand, NodeDefinition } from '@axiomtext/core';
import type { Node as PMNode } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  fixTables,
  goToNextCell,
  isInTable,
  mergeCells,
  setCellAttr,
  splitCell,
  tableEditing,
  tableNodes,
  toggleHeaderColumn,
  toggleHeaderRow,
} from 'prosemirror-tables';

const nodes = tableNodes({
  tableGroup: 'block',
  cellContent: 'block+',
  cellAttributes: {
    background: {
      default: null,
      getFromDOM: (dom) => sanitizeColor((dom as HTMLElement).style.backgroundColor),
      setDOMAttr: (value, attrs) => {
        const color = sanitizeColor(value as string | null);
        if (color)
          attrs['style'] =
            `${(attrs['style'] as string | undefined) ?? ''}background-color: ${color};`;
      },
    },
  },
}) as Record<string, NodeDefinition>;

const MAX_SIZE = 50;

/** Inserts a `rows` × `cols` table (first row as header by default) and puts the cursor in it. */
export const insertTable =
  (rows = 3, cols = 3, withHeaderRow = true): EditorCommand =>
  (state, dispatch) => {
    const {
      table,
      table_row: row,
      table_cell: cell,
      table_header: header,
      paragraph,
    } = state.schema.nodes;
    if (!table || !row || !cell || !header || !paragraph) return false;
    if (isInTable(state)) return false; // no nested tables from the toolbar
    const r = Math.max(1, Math.min(MAX_SIZE, Math.floor(rows)));
    const c = Math.max(1, Math.min(MAX_SIZE, Math.floor(cols)));
    if (!dispatch) return true;
    const makeRow = (isHeader: boolean): PMNode =>
      row.create(
        null,
        Array.from({ length: c }, () =>
          (isHeader ? header : cell).create(null, paragraph.create()),
        ),
      );
    const rowNodes = Array.from({ length: r }, (_, i) => makeRow(withHeaderRow && i === 0));
    const tableNode = table.create(null, rowNodes);
    const tr = state.tr.replaceSelectionWith(tableNode);
    // Put the cursor in the first cell.
    const start = tr.selection.from;
    let first = -1;
    tr.doc.descendants((node, pos) => {
      if (first === -1 && node === tableNode) first = pos;
      return first === -1;
    });
    const target = first !== -1 ? first + 3 : start;
    tr.setSelection(TextSelection.near(tr.doc.resolve(target)));
    dispatch(tr.scrollIntoView());
    return true;
  };

const tableCommand = (command: EditorCommand) => (): EditorCommand => (state, dispatch, view) =>
  isInTable(state) ? command(state, dispatch, view) : false;

export const addTableRowBefore = tableCommand(addRowBefore);
export const addTableRowAfter = tableCommand(addRowAfter);
export const addTableColumnBefore = tableCommand(addColumnBefore);
export const addTableColumnAfter = tableCommand(addColumnAfter);
export const deleteTableRow = tableCommand(deleteRow);
export const deleteTableColumn = tableCommand(deleteColumn);
export const deleteWholeTable = tableCommand(deleteTable);
export const mergeTableCells = tableCommand(mergeCells);
export const splitTableCell = tableCommand(splitCell);
export const toggleTableHeaderRow = tableCommand(toggleHeaderRow);
export const toggleTableHeaderColumn = tableCommand(toggleHeaderColumn);

/** Sets (or clears) the background color of the selected cells. */
export const setCellBackground =
  (color: string | null): EditorCommand =>
  (state, dispatch, view) => {
    if (!isInTable(state)) return false;
    const safe = color === null ? null : sanitizeColor(color);
    if (color !== null && !safe) return false;
    return setCellAttr('background', safe)(state, dispatch, view);
  };

export { isInTable };

/** True when the selection is inside a table (for showing table tools). */
export function selectionInTable(state: EditorState): boolean {
  return isInTable(state);
}

/** TBL-001…005, TBL-007: tables with header rows, cell merging, column resizing and keyboard navigation. */
export const Table = definePlugin({
  name: 'table',
  nodes,
  commands: {
    insertTable,
    addTableRowBefore,
    addTableRowAfter,
    addTableColumnBefore,
    addTableColumnAfter,
    deleteTableRow,
    deleteTableColumn,
    deleteWholeTable,
    mergeTableCells,
    splitTableCell,
    toggleTableHeaderRow,
    toggleTableHeaderColumn,
    setCellBackground,
  },
  keymap: () => ({
    Tab: goToNextCell(1),
    'Shift-Tab': goToNextCell(-1),
  }),
  enginePlugins: () => [
    columnResizing({ cellMinWidth: 48, lastColumnResizable: false }),
    tableEditing(),
  ],
  messages: {
    en: {
      'table.insert': 'Insert table',
      'table.rowAbove': 'Insert row above',
      'table.rowBelow': 'Insert row below',
      'table.colLeft': 'Insert column left',
      'table.colRight': 'Insert column right',
      'table.deleteRow': 'Delete row',
      'table.deleteCol': 'Delete column',
      'table.merge': 'Merge cells',
      'table.split': 'Split cell',
      'table.headerRow': 'Header row',
      'table.delete': 'Delete table',
    },
  },
});

export { fixTables };
