import { afterEach, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { List, toggleBulletList, toggleOrderedList, toggleTaskList } from '../src';

let t: TestView;
afterEach(() => t.destroy());
const run = (cmd: ReturnType<typeof toggleBulletList>) =>
  cmd(t.view.state, t.view.dispatch, t.view);
const topType = () => t.view.state.doc.firstChild?.type.name;

describe('list plugin', () => {
  it('"- " starts a bulleted list and "1. " a numbered list', () => {
    t = createTestView([List]);
    t.type('- item');
    expect(topType()).toBe('bullet_list');
    t.destroy();
    t = createTestView([List]);
    t.type('3. third');
    expect(topType()).toBe('ordered_list');
    expect(t.view.state.doc.firstChild?.attrs['start']).toBe(3);
  });

  it('"[ ] " starts a to-do list with an unchecked checkbox', () => {
    t = createTestView([List]);
    t.type('[ ] task');
    expect(topType()).toBe('task_list');
    const box = t.view.dom.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(box?.checked).toBe(false);
  });

  it('toggling the checkbox updates the document', () => {
    t = createTestView([List]);
    t.type('[ ] task');
    const box = t.view.dom.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!box) throw new Error('no checkbox');
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    expect(t.view.state.doc.firstChild?.firstChild?.attrs['checked']).toBe(true);
  });

  it('Enter creates a new item, Tab nests it', () => {
    t = createTestView([List]);
    t.type('- one');
    t.press('Enter');
    t.type('two');
    expect(t.view.state.doc.firstChild?.childCount).toBe(2);
    expect(t.press('Tab')).toBe(true);
    expect(t.view.state.doc.firstChild?.childCount).toBe(1);
  });

  it('toggles and converts between list types', () => {
    t = createTestView([List]);
    t.type('text');
    run(toggleBulletList());
    expect(topType()).toBe('bullet_list');
    run(toggleOrderedList());
    expect(topType()).toBe('ordered_list');
    run(toggleTaskList());
    expect(topType()).toBe('task_list');
    run(toggleTaskList());
    expect(topType()).toBe('paragraph');
  });
});
