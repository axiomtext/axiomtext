import { afterEach, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import { NodeSelection } from 'prosemirror-state';
import { Columns } from '@axiomtext/plugin-columns';
import {
  Image,
  createImagePlugin,
  deleteImage,
  insertImage,
  moveImage,
  sanitizeImageSrc,
  updateImage,
} from '../src';

let t: TestView | undefined;
afterEach(() => t?.destroy());
const run = (cmd: ReturnType<typeof insertImage>) => {
  if (!t) throw new Error('no view');
  return cmd(t.view.state, t.view.dispatch, t.view);
};
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

describe('sanitizeImageSrc', () => {
  it.each(['https://axiomtext.dev/a.png', '/img/a.png', PNG, 'blob:https://x/1'])(
    'allows %s',
    (src) => {
      expect(sanitizeImageSrc(src)).toBe(src);
    },
  );
  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:x',
  ])('blocks %s', (src) => expect(sanitizeImageSrc(src)).toBeNull());
});

describe('image plugin', () => {
  const imagePos = (): number => {
    let pos = -1;
    t?.view.state.doc.descendants((n, p) => {
      if (n.type.name === 'image') pos = p;
    });
    return pos;
  };
  const selectImage = (): void => {
    if (!t) return;
    t.view.dispatch(
      t.view.state.tr.setSelection(NodeSelection.create(t.view.state.doc, imagePos())),
    );
  };

  it('inserts an image inside the text so you can type before and after it', () => {
    t = createTestView([Image]);
    t.type('Before ');
    expect(run(insertImage(PNG, 'A pixel'))).toBe(true);
    t.type(' after');
    const para = t.view.state.doc.firstChild;
    expect(para?.type.name).toBe('paragraph');
    expect(para?.childCount).toBe(3); // text, image, text
    expect(para?.child(1).attrs['wrap']).toBe('inline');
    expect(t.view.dom.querySelector('span.ax-image img')?.getAttribute('alt')).toBe('A pixel');
  });

  it('breaks text by default when inserted on an empty line', () => {
    t = createTestView([Image]);
    run(insertImage(PNG));
    expect(t.view.dom.querySelector<HTMLElement>('span.ax-image')?.dataset['wrap']).toBe('block');
  });

  const shape = (): string =>
    (t?.view.state.doc.toJSON().content as { content?: { type: string; text?: string }[] }[])
      .map((p) => (p.content ?? []).map((n) => (n.type === 'image' ? '[IMG]' : n.text)).join(''))
      .join(' | ');

  it('moves a selected image through the text and between paragraphs', () => {
    t = createTestView([Image]);
    t.type('ab');
    run(insertImage(PNG));
    t.type('cd');
    selectImage();
    expect(shape()).toBe('ab[IMG]cd');
    run(moveImage('right'));
    expect(shape()).toBe('abc[IMG]d');
    run(moveImage('left'));
    run(moveImage('left'));
    run(moveImage('left'));
    expect(shape()).toBe('[IMG]abcd');
    // At the start of the document it stays put and stays selected.
    expect(run(moveImage('left'))).toBe(false);
    expect(t.view.state.selection).toBeInstanceOf(NodeSelection);
  });

  it('typing or Enter on a selected image keeps the image', () => {
    t = createTestView([Image]);
    t.type('ab');
    run(insertImage(PNG));
    selectImage();
    t.type('X');
    expect(shape()).toBe('ab[IMG]X');
    selectImage();
    const view = t.view;
    view.someProp('handleKeyDown', (f) => f(view, new KeyboardEvent('keydown', { key: 'Enter' })));
    expect(shape()).toBe('ab[IMG] | X');
  });

  it('puts text on both sides of an image and back again', () => {
    t = createTestView([Image, Columns]);
    t.type('Left side ');
    run(insertImage(PNG));
    t.type(' right side');
    selectImage();
    expect(run(updateImage({ wrap: 'both' }))).toBe(true);
    const cols = t.view.dom.querySelectorAll(
      '.ax-columns[data-layout="image-center"] > .ax-column',
    );
    expect([...cols].map((c) => c.textContent)).toEqual(['Left side', '', 'right side']);
    expect(t.view.state.selection).toBeInstanceOf(NodeSelection);
    // Choosing another wrap joins the text back into one paragraph.
    expect(run(updateImage({ wrap: 'inline' }))).toBe(true);
    expect(t.view.dom.querySelector('.ax-columns')).toBeNull();
    expect(shape()).toBe('Left side [IMG] right side');
  });

  it('splits one-sided text at a sentence so both sides get text', () => {
    t = createTestView([Image, Columns]);
    run(insertImage(PNG));
    t.type('First sentence here. Second sentence here.');
    selectImage();
    run(updateImage({ wrap: 'both' }));
    const cols = t.view.dom.querySelectorAll('.ax-column');
    expect(cols[0]?.textContent).toBe('First sentence here.');
    expect(cols[2]?.textContent).toBe('Second sentence here.');
  });

  it('removes the layout when its image is deleted', () => {
    t = createTestView([Image, Columns]);
    t.type('a ');
    run(insertImage(PNG));
    t.type(' b');
    selectImage();
    run(updateImage({ wrap: 'both' }));
    run(deleteImage());
    expect(t.view.dom.querySelector('.ax-columns')).toBeNull();
    expect(shape()).toBe('a | b');
  });

  it('offers both sides only when the columns plugin is loaded', () => {
    t = createTestView([Image]);
    t.type('x ');
    run(insertImage(PNG));
    selectImage();
    expect(run(updateImage({ wrap: 'both' }))).toBe(false);
  });

  it('refuses unsafe sources', () => {
    t = createTestView([Image]);
    expect(run(insertImage('javascript:alert(1)'))).toBe(false);
  });

  it('switches wrap mode, width, alt text and caption, then deletes', () => {
    t = createTestView([Image]);
    t.type('Text ');
    run(insertImage(PNG));
    selectImage();
    expect(run(updateImage({ wrap: 'left', width: 40, alt: 'Logo', caption: 'Figure 1' }))).toBe(
      true,
    );
    const box = t.view.dom.querySelector<HTMLElement>('span.ax-image');
    expect(box?.dataset['wrap']).toBe('left');
    expect(box?.style.width).toBe('40%');
    expect(box?.querySelector('.ax-image__caption')?.textContent).toBe('Figure 1');
    expect(run(updateImage({ width: 1 }))).toBe(true);
    expect(box?.style.width).toBe('5%'); // clamped
    expect(run(updateImage({ wrap: 'sideways' as never }))).toBe(false);
    expect(run(deleteImage())).toBe(true);
    expect(t.view.dom.querySelector('span.ax-image')).toBeNull();
  });

  it('parses AxiomText, figure and plain img HTML; drops unsafe images', async () => {
    const { DOMParser } = await import('prosemirror-model');
    t = createTestView([createImagePlugin()]);
    const div = document.createElement('div');
    div.innerHTML = [
      '<p>Hi <span class="ax-image" data-wrap="right" style="width: 30%"><img src="/a.png" alt="A"><span class="ax-image__caption">Cap A</span></span> there</p>',
      '<figure data-align="center" style="width: 50%"><img src="https://x.dev/b.png" alt="B"><figcaption>Cap B</figcaption></figure>',
      '<p><img src="javascript:alert(1)"></p>',
    ].join('');
    const doc = DOMParser.fromSchema(t.view.state.schema).parse(div);
    const images: Record<string, unknown>[] = [];
    doc.descendants((n) => {
      if (n.type.name === 'image') images.push(n.attrs);
    });
    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({ src: '/a.png', wrap: 'right', width: 30, caption: 'Cap A' });
    expect(images[1]).toMatchObject({
      src: 'https://x.dev/b.png',
      wrap: 'block',
      width: 50,
      caption: 'Cap B',
    });
  });
});
