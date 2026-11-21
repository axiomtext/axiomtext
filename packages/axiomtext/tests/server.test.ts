import { describe, expect, it } from 'vitest';
import { listMarks, renderHTML } from '../src/server';
import { chapter } from './chapter.fixture';

const TYPES = [{ id: 'important', label: 'Important', color: '#16a34a', style: 'fill' as const }];

describe('renderHTML on the server', () => {
  it('runs without a browser document', () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
  });

  it('renders marks, pages, links and escapes text', async () => {
    const html = await renderHTML(chapter, { markTypes: TYPES, math: 'latex' });
    expect(html).toContain('<div class="ax-page" data-page="23" data-label="Page 23"');
    expect(html).toContain('<h2>Photosynthesis &amp; &lt;light&gt;</h2>');
    expect(html).toContain(
      '<strong><mark class="ax-mark" data-mark-type="important" data-mark-id="m1" data-mark-style="fill" style="--ax-mark: #16a34a;" title="Important" data-mark="{&quot;questionIds&quot;:[&quot;q1&quot;]}" data-badge="1">photosynthesis</mark></strong>',
    );
    expect(html).toContain('\\(E = mc^2\\)');
    expect(html).toContain('href="https://example.com"');
  });

  it('pre-renders equations with KaTeX by default', async () => {
    const html = await renderHTML(chapter, { markTypes: TYPES });
    expect(html).toContain('class="katex"');
    expect(html).toContain('data-latex="E = mc^2"');
  });

  it('page labels in the reader’s language', async () => {
    const html = await renderHTML(chapter, {
      language: 'bn',
      translations: { 'Page {number}': 'পৃষ্ঠা {number}' },
      math: 'latex',
    });
    expect(html).toContain('data-label="পৃষ্ঠা ২৩"');
  });

  it('lists marks with their page for the app', () => {
    expect(listMarks(chapter)[0]).toMatchObject({ id: 'm1', page: 23, text: 'photosynthesis' });
  });
});
