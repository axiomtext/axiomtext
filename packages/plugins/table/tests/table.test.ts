import { afterEach, describe, expect, it } from 'vitest';
import type { Node as PMNode } from 'prosemirror-model';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import {
  Table,
  addTableColumnAfter,
  addTableRowAfter,
  deleteTableRow,
  deleteWholeTable,
  insertTable,
  setCellBackground,
} from '../src';

let t: TestView;
afterEach(() => t.destroy());
const run = (cmd: ReturnType<typeof insertTable>) => cmd(t.view.state, t.view.dispatch, t.view);
const table = () => {
  let found: PMNode | null = null;
  t.view.state.doc.descendants((n) => {
    if (n.type.name === 'table') found = n;
    return !found;
  });
  return found as PMNode | null;
};

describe('table plugin', () => {
  it('inserts a table with a header row and the cursor inside', () => {
    t = createTestView([Table]);
    expect(run(insertTable(2, 3))).toBe(true);
    const tbl = table();
    expect(tbl?.childCount).toBe(2);
    expect(tbl?.firstChild?.childCount).toBe(3);
    expect(tbl?.firstChild?.firstChild?.type.name).toBe('table_header');
    t.type('Name');
    expect(t.html()).toContain('<th');
    expect(t.html()).toContain('Name');
  });

  it('adds rows and columns, Tab moves to the next cell', () => {
    t = createTestView([Table]);
    run(insertTable(2, 2));
    run(addTableRowAfter());
    run(addTableColumnAfter());
    expect(table()?.childCount).toBe(3);
    expect(table()?.firstChild?.childCount).toBe(3);
    const before = t.view.state.selection.from;
    expect(t.press('Tab')).toBe(true);
    expect(t.view.state.selection.from).toBeGreaterThan(before);
  });

  it('deletes rows and the whole table', () => {
    t = createTestView([Table]);
    run(insertTable(3, 2));
    run(deleteTableRow());
    expect(table()?.childCount).toBe(2);
    run(deleteWholeTable());
    expect(table()).toBeNull();
  });

  it('clamps huge sizes and sanitizes cell colors', () => {
    t = createTestView([Table]);
    run(insertTable(1000, 2));
    expect(table()?.childCount).toBe(50);
    expect(run(setCellBackground('url(evil)'))).toBe(false);
    expect(run(setCellBackground('#eef'))).toBe(true);
    expect(t.html()).toContain('background-color: #eef;');
  });
});
