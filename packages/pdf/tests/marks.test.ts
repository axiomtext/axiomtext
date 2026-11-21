import { describe, expect, it } from 'vitest';
import { listPdfMarks } from '../src';

const anchor = (exact: string) => ({ exact, prefix: '', suffix: '', start: 0, end: exact.length });

describe('listPdfMarks', () => {
  it('returns the marks like editor.getMarks(), in reading order, without highlights', () => {
    const marks = listPdfMarks([
      {
        id: 'b',
        kind: 'mark',
        type: 'IMPORTANT',
        page: 2,
        anchor: anchor('F = ma'),
        rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.02 }],
        data: { questionIds: ['q1'] },
      },
      { id: 'h', kind: 'highlight', color: 'yellow', page: 1, anchor: anchor('mine'), rects: [] },
      {
        id: 'a2',
        kind: 'mark',
        type: 'PREVIOUS_YEAR',
        page: 1,
        anchor: anchor('lower'),
        rects: [{ x: 0.1, y: 0.6, w: 0.3, h: 0.02 }],
      },
      {
        id: 'a1',
        kind: 'mark',
        type: 'MARKED',
        page: 1,
        anchor: anchor('upper'),
        rects: [{ x: 0.1, y: 0.1, w: 0.3, h: 0.02 }],
        badge: '2',
      },
    ]);
    expect(
      marks.map(({ id, type, text, page, data, badge }) => ({ id, type, text, page, data, badge })),
    ).toEqual([
      { id: 'a1', type: 'MARKED', text: 'upper', page: 1, data: null, badge: '2' },
      { id: 'a2', type: 'PREVIOUS_YEAR', text: 'lower', page: 1, data: null, badge: null },
      {
        id: 'b',
        type: 'IMPORTANT',
        text: 'F = ma',
        page: 2,
        data: { questionIds: ['q1'] },
        badge: null,
      },
    ]);
  });
});
