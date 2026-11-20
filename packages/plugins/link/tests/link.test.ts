import { afterEach, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { Link, normalizeHref, setLink, unsetLink } from '../src';

let t: TestView;
afterEach(() => t?.destroy());

describe('normalizeHref', () => {
  it.each([
    ['https://axiomtext.dev', 'https://axiomtext.dev'],
    ['www.axiomtext.dev', 'https://www.axiomtext.dev'],
    ['axiomtext.dev/docs', 'https://axiomtext.dev/docs'],
    ['hello@axiomtext.dev', 'mailto:hello@axiomtext.dev'],
    ['/relative/path', '/relative/path'],
  ])('%s → %s', (input, out) => expect(normalizeHref(input)).toBe(out));

  it('rejects unsafe URLs', () => {
    expect(normalizeHref('javascript:alert(1)')).toBeNull();
    expect(normalizeHref('  ')).toBeNull();
  });
});

describe('link plugin', () => {
  it('auto-links a typed URL followed by a space', () => {
    t = createTestView([Link]);
    t.type('visit https://axiomtext.dev now');
    expect(t.html()).toContain(
      '<a href="https://axiomtext.dev" rel="noopener noreferrer nofollow">https://axiomtext.dev</a>',
    );
  });

  it('sets, updates and removes a link on a selection', () => {
    t = createTestView([Link]);
    t.type('AxiomText');
    t.select(1, 10);
    expect(setLink('axiomtext.dev')(t.view.state, t.view.dispatch)).toBe(true);
    expect(t.html()).toContain('href="https://axiomtext.dev"');
    t.select(4);
    setLink('https://github.com/axiomtext')(t.view.state, t.view.dispatch);
    expect(t.html()).toContain('href="https://github.com/axiomtext"');
    unsetLink()(t.view.state, t.view.dispatch);
    expect(t.html()).not.toContain('<a');
  });

  it('refuses javascript: links', () => {
    t = createTestView([Link]);
    t.type('click');
    t.select(1, 6);
    expect(setLink('javascript:alert(1)')(t.view.state, t.view.dispatch)).toBe(false);
    expect(t.html()).not.toContain('<a');
  });
});
