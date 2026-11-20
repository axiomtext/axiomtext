import { afterEach, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { Columns, insertColumns, removeColumns, sanitizeWidths, setColumnWidths } from '../src';

let t: TestView | undefined;
afterEach(() => t?.destroy());
const run = (cmd: ReturnType<typeof insertColumns>) => {
  if (!t) throw new Error('no view');
  return cmd(t.view.state, t.view.dispatch, t.view);
};

describe('sanitizeWidths', () => {
  it('rescales to 100 and clamps', () => {
    expect(sanitizeWidths([1, 1], 2)).toEqual([50, 50]);
    expect(sanitizeWidths([30, 40, 30], 3)).toEqual([30, 40, 30]);
    expect(sanitizeWidths([1, 1000, 1], 3)?.[1]).toBeLessThanOrEqual(90);
  });
  it('rejects bad input', () => {
    expect(sanitizeWidths([1, 2], 3)).toBeNull();
    expect(sanitizeWidths(['x', 2], 2)).toBeNull();
    expect(sanitizeWidths('30 40', 2)).toBeNull();
  });
});

describe('columns plugin', () => {
  it('inserts columns, types in them, sets widths and removes them', () => {
    t = createTestView([Columns]);
    expect(run(insertColumns(3))).toBe(true);
    t.type('one');
    const html = (): string => t?.view.dom.innerHTML ?? '';
    expect(html()).toContain('class="ax-columns"');
    expect(t.view.dom.querySelectorAll('.ax-column')).toHaveLength(3);
    expect(t.view.dom.querySelector('.ax-column p')?.textContent).toBe('one');
    expect(run(insertColumns(2))).toBe(false); // no columns inside columns
    expect(run(setColumnWidths([20, 60, 20]))).toBe(true);
    expect(t.view.dom.querySelector<HTMLElement>('.ax-columns')?.style.gridTemplateColumns).toBe(
      '20fr 60fr 20fr',
    );
    expect(run(removeColumns())).toBe(true);
    expect(t.view.dom.querySelector('.ax-columns')).toBeNull();
    expect(t.view.state.doc.textContent).toBe('one');
  });

  it('shows a hint in empty columns', () => {
    t = createTestView([Columns]);
    run(insertColumns(2));
    expect(t.view.dom.querySelectorAll('.ax-column__empty')).toHaveLength(2);
  });
});
