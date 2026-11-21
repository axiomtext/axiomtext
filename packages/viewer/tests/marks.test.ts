import { describe, expect, it } from 'vitest';
import { createViewer } from '../src';

const page = (): HTMLElement => {
  const root = document.createElement('div');
  root.className = 'axiomtext-content';
  root.innerHTML = [
    '<p>Water <mark class="ax-mark" data-mark-id="m1" data-mark-type="IMPORTANT" data-badge="3">boils</mark> at 100 degrees.</p>',
    '<p>Nothing here.</p>',
    '<p><mark class="ax-mark" data-mark-id="m2" data-mark-type="IMPORTANT">Ice</mark> melts at 0 degrees.</p>',
  ].join('');
  document.body.append(root);
  return root;
};

describe('readers’ states on a web page', () => {
  it('fades learned marks, adds the tick and filters "not learned yet"', () => {
    const root = page();
    const viewer = createViewer(root, {
      marks: {
        types: [{ id: 'IMPORTANT', label: 'Important', color: '#dc2626' }],
        legend: false,
        states: { learned: { fade: true, badge: '✓' } },
        initialStates: { m1: 'learned' },
      },
    });
    const m1 = root.querySelector<HTMLElement>('[data-mark-id="m1"]');
    expect(m1?.getAttribute('data-mark-state')).toBe('learned');
    expect(m1?.classList.contains('ax-mark-faded')).toBe(true);
    expect([...root.querySelectorAll('.ax-mark-badge')].map((b) => b.textContent)).toEqual(['3 ✓']);

    viewer.setMarkFilter({ excludeStates: ['learned'] });
    expect([...root.querySelectorAll('p')].map((p) => p.classList.contains('ax-folded'))).toEqual([
      true,
      true,
      false,
    ]);

    viewer.setMarkState('m1', null);
    expect(m1?.hasAttribute('data-mark-state')).toBe(false);
    // Not learned any more: its paragraph opens again.
    expect([...root.querySelectorAll('p')].map((p) => p.classList.contains('ax-folded'))).toEqual([
      false,
      true,
      false,
    ]);
    viewer.destroy();
  });
});
