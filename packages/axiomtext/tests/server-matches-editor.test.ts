// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { createEditor } from '@axiomtext/view';
import { ALL_PLUGINS } from '../src/plugins';
import { renderHTML } from '../src/server';
import { chapter } from './chapter.fixture';

it('server HTML is the same as editor.getHTML()', async () => {
  const types = [{ id: 'important', label: 'Important', color: '#16a34a', style: 'fill' as const }];
  const element = document.createElement('div');
  document.body.append(element);
  const editor = createEditor({
    element,
    plugins: ALL_PLUGINS,
    content: chapter,
    config: { marks: { types } },
  });
  expect(await renderHTML(chapter, { markTypes: types, math: 'latex' })).toBe(editor.getHTML());
  editor.destroy();
});
