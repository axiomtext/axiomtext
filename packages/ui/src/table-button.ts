import type { Editor } from '@axiomtext/view';
import { h } from './dom';
import { icon } from './icons';
import { openPopoverPanel } from './popover';
import type { Popover } from './popover';

const ROWS = 8;
const COLS = 10;

/** "Insert table" button with a hover grid picker (keyboard: arrows + Enter). */
export function createTableButton(editor: Editor): { element: HTMLButtonElement; destroy(): void } {
  const button = h(
    'button',
    {
      type: 'button',
      class: 'ax-button',
      'aria-label': 'Insert table',
      'aria-haspopup': 'dialog',
      'data-tooltip': 'Insert table',
    },
    [icon('table')],
  );
  let popover: Popover | null = null;

  const open = (): void => {
    let rows = 2;
    let cols = 3;
    const cells: HTMLElement[] = [];
    const grid = h('div', {
      class: 'ax-table-grid',
      role: 'grid',
      tabindex: '0',
      'aria-label': 'Table size',
    });
    const caption = h('div', { class: 'ax-table-grid__caption', 'aria-live': 'polite' });
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        const cell = h('span', {
          class: 'ax-table-grid__cell',
          'data-r': String(r),
          'data-c': String(c),
        });
        cell.addEventListener('mouseenter', () => paint(r, c));
        cell.addEventListener('mousedown', (e) => e.preventDefault());
        cell.addEventListener('click', () => insert(r, c));
        cells.push(cell);
        grid.append(cell);
      }
    }
    const paint = (r: number, c: number): void => {
      rows = r;
      cols = c;
      for (const cell of cells) {
        const on = Number(cell.dataset['r']) <= r && Number(cell.dataset['c']) <= c;
        cell.classList.toggle('is-on', on);
      }
      caption.textContent = `${c} × ${r} table`;
    };
    const insert = (r: number, c: number): void => {
      popover?.close();
      editor.execute('insertTable', r, c, true);
      editor.focus();
    };
    grid.addEventListener('keydown', (event) => {
      const moves: Record<string, [number, number]> = {
        ArrowRight: [0, 1],
        ArrowLeft: [0, -1],
        ArrowDown: [1, 0],
        ArrowUp: [-1, 0],
      };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        paint(
          Math.max(1, Math.min(ROWS, rows + move[0])),
          Math.max(1, Math.min(COLS, cols + move[1])),
        );
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        insert(rows, cols);
      }
    });
    paint(rows, cols);
    popover = openPopoverPanel([grid, caption], {
      anchor: button,
      label: 'Insert table',
      className: 'ax-table-popover',
      onClose: () => (popover = null),
    });
    grid.focus();
  };

  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('click', () => (popover ? popover.close() : open()));
  return { element: button, destroy: () => popover?.close() };
}
