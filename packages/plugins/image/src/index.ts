import { definePlugin } from '@axiomtext/core';
import type { AxiomPlugin, EditorCommand } from '@axiomtext/core';
import type { Node as PMNode } from 'prosemirror-model';
import { NodeSelection, Plugin } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  canWrapBothSides,
  centerWidths,
  imageLayoutAt,
  unwrapBothSides,
  wrapBothSides,
} from './both-sides';
import {
  caretAfterImage,
  imageKeyboardPlugin,
  moveImageTransaction,
  newLineAfterImage,
} from './keyboard';
import type { MoveDirection } from './keyboard';

export { moveImageTransaction, canWrapBothSides };
export type { MoveDirection };

// ───────────────────────── Safety ─────────────────────────

// eslint-disable-next-line no-control-regex -- strip control chars/spaces browsers ignore in schemes
const SCHEME_NOISE = new RegExp('[\\u0000-\\u0020]', 'g');
const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,[a-z0-9+/=\s]+$/i;

/**
 * Returns a safe image URL or null (SEC-001). Allowed: http(s), relative URLs, blob: and
 * base64 data URLs of raster formats. SVG data URLs and every other scheme are rejected.
 */
export function sanitizeImageSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const src = raw.trim();
  if (DATA_IMAGE.test(src)) return src;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(src.replace(SCHEME_NOISE, ''))?.[1]?.toLowerCase();
  if (!scheme) return src; // relative URL
  return scheme === 'http' || scheme === 'https' || scheme === 'blob' ? src : null;
}

// ───────────────────────── Upload adapters (MED-008) ─────────────────────────

/** Turns a file into a URL the document can store. Implement it to upload to your server, S3, … */
export interface ImageUploadAdapter {
  upload(file: File): Promise<string>;
}

/** Default adapter: embeds the image in the document as a base64 data URL (no server needed). */
export const base64UploadAdapter: ImageUploadAdapter = {
  upload: (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
      reader.readAsDataURL(file);
    }),
};

/** Simple adapter that POSTs the file as multipart/form-data and expects `{ "url": "…" }` back. */
export function createXhrUploadAdapter(
  endpoint: string,
  headers: Record<string, string> = {},
): ImageUploadAdapter {
  return {
    async upload(file) {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(endpoint, {
        method: 'POST',
        body,
        headers,
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status}).`);
      const json = (await response.json()) as { url?: unknown };
      if (typeof json.url !== 'string') throw new Error('Upload response has no "url".');
      return json.url;
    },
  };
}

export interface ImagePluginOptions {
  /** Where images go. Default: embedded as base64. */
  upload?: ImageUploadAdapter;
  /** Largest accepted file in bytes. Default: 5 MB. */
  maxFileSize?: number;
  /** Accepted MIME types. Default: png, jpeg, gif, webp, avif. */
  accept?: readonly string[];
  /**
   * After clicking an image, arrow keys move it through the text (default true).
   * Alt+Shift+arrows always move a selected image.
   */
  arrowKeysMove?: boolean;
}

const DEFAULT_ACCEPT = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'];

/**
 * How text flows around an image:
 * - `inline` — sits on the text line, like a big character (text before/after on the same line)
 * - `left` / `right` — floats to that side; text wraps around it for as many lines as it is tall
 * - `block` — on its own line, centered; text above and below ("break text")
 * - `both` — centered with text on both sides (needs the columns plugin; see both-sides.ts)
 */
export type ImageWrap = 'inline' | 'left' | 'right' | 'block' | 'both';
export const IMAGE_WRAPS: readonly ImageWrap[] = ['inline', 'left', 'right', 'block', 'both'];

/** Dispatched on the editor element when an upload fails: `event.detail.message`. */
export const IMAGE_ERROR_EVENT = 'axiomtext:image-error';

const clampWidth = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) && n > 0 ? Math.round(Math.max(5, Math.min(100, n))) : null;
};

/** Legacy `data-align` values from the earlier figure-based image. */
const wrapFromAlign = (align: string | null): ImageWrap | null =>
  align === 'left' || align === 'right'
    ? align
    : align === 'center' || align === 'full'
      ? 'block'
      : null;

// ───────────────────────── Commands ─────────────────────────

const imageAtSelection = (state: EditorState): { node: PMNode; pos: number } | null => {
  const sel = state.selection;
  return sel instanceof NodeSelection && sel.node.type.name === 'image'
    ? { node: sel.node, pos: sel.from }
    : null;
};

/** Images in an empty line break the text; inside a sentence they sit in line with it. */
const defaultWrap = (state: EditorState): ImageWrap => {
  const parent = state.selection.$from.parent;
  return parent.isTextblock && parent.content.size === 0 ? 'block' : 'inline';
};

/** Inserts an image from a URL at the cursor (rejects unsafe URLs). */
export const insertImage =
  (src: string, alt = ''): EditorCommand =>
  (state, dispatch) => {
    const type = state.schema.nodes['image'];
    const safe = sanitizeImageSrc(src);
    if (!type || !safe) return false;
    if (dispatch) {
      const node = type.create({ src: safe, alt: alt.slice(0, 500), wrap: defaultWrap(state) });
      dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
    }
    return true;
  };

/** Updates the selected image: wrap mode, width (5–100 % of the line), alt text, caption. */
export const updateImage =
  (attrs: {
    wrap?: ImageWrap;
    width?: number | null;
    alt?: string;
    caption?: string;
  }): EditorCommand =>
  (state, dispatch) => {
    const found = imageAtSelection(state);
    if (!found) return false;
    const next: Record<string, unknown> = { ...found.node.attrs };
    if (attrs.wrap !== undefined) {
      if (!IMAGE_WRAPS.includes(attrs.wrap)) return false;
      next['wrap'] = attrs.wrap;
    }
    if (attrs.width !== undefined)
      next['width'] = attrs.width === null ? null : clampWidth(attrs.width);
    if (attrs.alt !== undefined) next['alt'] = attrs.alt.slice(0, 500);
    if (attrs.caption !== undefined) next['caption'] = attrs.caption.slice(0, 500);
    const inLayout = imageLayoutAt(state, found.pos) !== null;
    // Text on both sides: the paragraph becomes text | image | text (and back again).
    const special =
      attrs.wrap === 'both'
        ? wrapBothSides(state, found.pos, next)
        : inLayout && attrs.wrap !== undefined
          ? unwrapBothSides(state, found.pos, next)
          : undefined;
    if (special === null) return false;
    if (dispatch) {
      if (special) {
        dispatch(special);
        return true;
      }
      const tr = state.tr.setNodeMarkup(found.pos, undefined, next);
      tr.setSelection(NodeSelection.create(tr.doc, found.pos));
      dispatch(tr);
    }
    return true;
  };

/** Moves the selected image one character (left/right) or one line (up/down). */
export const moveImage =
  (direction: MoveDirection): EditorCommand =>
  (state, dispatch, view) => {
    const tr = moveImageTransaction(state, direction, view);
    if (!tr) return false;
    dispatch?.(tr);
    return true;
  };

/** Removes the selected image. */
export const deleteImage = (): EditorCommand => (state, dispatch) => {
  const found = imageAtSelection(state);
  if (!found) return false;
  dispatch?.(state.tr.delete(found.pos, found.pos + found.node.nodeSize).scrollIntoView());
  return true;
};

// ───────────────────────── Node view (MED-002 resize) ─────────────────────────

class ImageView implements NodeView {
  dom: HTMLElement;
  private img: HTMLImageElement;
  private caption: HTMLElement;

  constructor(
    private node: PMNode,
    private view: EditorView,
    private getPos: () => number | undefined,
  ) {
    this.dom = document.createElement('span');
    this.dom.className = 'ax-image';
    this.dom.contentEditable = 'false';
    this.img = document.createElement('img');
    this.img.draggable = false;
    this.img.loading = 'lazy';
    this.img.decoding = 'async';
    const handle = document.createElement('span');
    handle.className = 'ax-image__handle';
    handle.setAttribute('aria-hidden', 'true');
    handle.addEventListener('pointerdown', (e) => this.startResize(e));
    this.caption = document.createElement('span');
    this.caption.className = 'ax-image__caption';
    // The frame keeps the resize handle on the picture's corner, not under the caption.
    const frame = document.createElement('span');
    frame.className = 'ax-image__frame';
    frame.append(this.img, handle);
    this.dom.append(frame, this.caption);
    this.sync();
  }

  private sync(): void {
    const { src, alt, width, wrap, caption } = this.node.attrs as {
      src: string;
      alt: string;
      width: number | null;
      wrap: ImageWrap;
      caption: string;
    };
    const safe = sanitizeImageSrc(src);
    if (safe && this.img.getAttribute('src') !== safe) this.img.src = safe;
    this.img.alt = alt;
    this.dom.dataset['wrap'] = wrap;
    this.dom.style.width = width ? `${width}%` : '';
    this.caption.textContent = caption;
    this.caption.hidden = caption === '';
  }

  private startResize(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const layout = this.dom.closest<HTMLElement>('.ax-columns[data-layout="image-center"]');
    if (layout && this.node.attrs['wrap'] === 'both') {
      this.resizeLayout(event, layout);
      return;
    }
    const container =
      this.dom.closest('p, li, td, th, blockquote, h1, h2, h3, h4, h5, h6') ??
      this.dom.parentElement;
    if (!container) return;
    const containerWidth = container.getBoundingClientRect().width;
    const startX = event.clientX;
    const startWidth = this.dom.getBoundingClientRect().width;
    const wrap = this.node.attrs['wrap'] as ImageWrap;
    const direction = wrap === 'right' ? -1 : 1;
    const factor = wrap === 'block' ? 2 : 1; // centered: both sides grow
    let pct = (startWidth / containerWidth) * 100;
    this.dom.classList.add('is-resizing');
    const onMove = (e: PointerEvent): void => {
      const delta = (e.clientX - startX) * direction * factor;
      pct = Math.max(5, Math.min(100, ((startWidth + delta) / containerWidth) * 100));
      this.dom.style.width = `${pct}%`;
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.dom.classList.remove('is-resizing');
      const pos = this.getPos();
      if (pos === undefined) return;
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        width: Math.round(pct),
      });
      tr.setSelection(NodeSelection.create(tr.doc, pos));
      this.view.dispatch(tr);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** Text on both sides: the handle sets how wide the middle (image) column is. */
  private resizeLayout(event: PointerEvent, layout: HTMLElement): void {
    const total = layout.getBoundingClientRect().width;
    const startX = event.clientX;
    const startWidth = this.dom.getBoundingClientRect().width;
    let pct = (startWidth / total) * 100;
    const apply = (): void => {
      layout.style.gridTemplateColumns = centerWidths(pct)
        .map((w) => `${w}fr`)
        .join(' ');
    };
    this.dom.classList.add('is-resizing');
    const onMove = (e: PointerEvent): void => {
      // Centered: the image grows on both sides, so the width changes twice as fast.
      pct = Math.max(10, Math.min(80, ((startWidth + (e.clientX - startX) * 2) / total) * 100));
      apply();
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.dom.classList.remove('is-resizing');
      const pos = this.getPos();
      if (pos === undefined) return;
      const found = imageLayoutAt(this.view.state, pos);
      if (!found) return;
      const tr = this.view.state.tr.setNodeMarkup(found.pos, undefined, {
        ...found.node.attrs,
        widths: centerWidths(pct),
      });
      tr.setSelection(NodeSelection.create(tr.doc, pos));
      this.view.dispatch(tr);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.sync();
    return true;
  }

  selectNode(): void {
    this.dom.classList.add('is-selected');
  }

  deselectNode(): void {
    this.dom.classList.remove('is-selected');
  }

  stopEvent(event: Event): boolean {
    return (event.target as HTMLElement).classList?.contains('ax-image__handle') ?? false;
  }

  ignoreMutation(): boolean {
    return true;
  }
}

// ───────────────────────── Plugin factory ─────────────────────────

/**
 * When the image leaves a "text on both sides" layout (deleted, cut or dragged out),
 * the layout goes too and its text becomes ordinary paragraphs again.
 */
const dissolveEmptyLayouts = (): Plugin =>
  new Plugin({
    appendTransaction: (trs, _old, state) => {
      if (!trs.some((tr) => tr.docChanged)) return null;
      const targets: { node: PMNode; pos: number }[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type.name !== 'columns') return !node.isTextblock;
        if (node.attrs['layout'] === 'image-center') {
          let hasImage = false;
          node.descendants((n) => {
            if (n.type.name === 'image') hasImage = true;
            return !hasImage;
          });
          if (!hasImage) targets.push({ node, pos });
        }
        return false;
      });
      if (targets.length === 0) return null;
      const tr = state.tr;
      for (const { node, pos } of targets.reverse()) {
        const blocks: PMNode[] = [];
        node.forEach((col) =>
          col.forEach((b) => {
            if (!(b.isTextblock && b.content.size === 0)) blocks.push(b);
          }),
        );
        const paragraph = state.schema.nodes['paragraph'];
        if (blocks.length === 0 && paragraph) blocks.push(paragraph.create());
        tr.replaceWith(pos, pos + node.nodeSize, blocks);
      }
      return tr;
    },
  });

const attrsFromImg = (img: HTMLElement, wrapper?: HTMLElement): Record<string, unknown> | false => {
  const src = sanitizeImageSrc(img.getAttribute('src'));
  if (!src) return false;
  const box = wrapper ?? img;
  const wrap = (IMAGE_WRAPS as readonly string[]).includes(box.getAttribute('data-wrap') ?? '')
    ? (box.getAttribute('data-wrap') as ImageWrap)
    : (wrapFromAlign(box.getAttribute('data-align')) ??
      (box.style.float === 'left' || box.style.float === 'right'
        ? (box.style.float as ImageWrap)
        : 'inline'));
  const widthStyle = box.style.width;
  return {
    src,
    alt: img.getAttribute('alt') ?? '',
    width: widthStyle.endsWith('%') ? clampWidth(widthStyle) : null,
    wrap,
    caption:
      wrapper?.querySelector('figcaption, .ax-image__caption')?.textContent?.trim().slice(0, 500) ??
      '',
  };
};

/** Creates the image plugin with your upload adapter and limits. */
export function createImagePlugin(options: ImagePluginOptions = {}): AxiomPlugin {
  const adapter = options.upload ?? base64UploadAdapter;
  const maxSize = options.maxFileSize ?? 5 * 1024 * 1024;
  const accept = options.accept ?? DEFAULT_ACCEPT;

  const report = (view: EditorView, message: string): void => {
    view.dom.dispatchEvent(
      new CustomEvent(IMAGE_ERROR_EVENT, { detail: { message }, bubbles: true }),
    );
  };

  /** Uploads files and inserts them at `pos` (or the selection). */
  const uploadFiles = (view: EditorView, files: readonly File[], pos?: number): boolean => {
    const images = files.filter((f) => accept.includes(f.type));
    if (images.length === 0) {
      if (files.length) report(view, 'Only PNG, JPEG, GIF, WebP and AVIF images can be added.');
      return false;
    }
    for (const file of images) {
      if (file.size > maxSize) {
        report(view, `"${file.name}" is larger than ${Math.round(maxSize / 1024 / 1024)} MB.`);
        continue;
      }
      void adapter
        .upload(file)
        .then((url) => {
          const type = view.state.schema.nodes['image'];
          const src = sanitizeImageSrc(url);
          if (!type || !src || view.isDestroyed) return;
          const node = type.create({
            src,
            alt: file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 120),
            wrap: defaultWrap(view.state),
          });
          const tr =
            pos !== undefined && pos <= view.state.doc.content.size
              ? view.state.tr.replaceRangeWith(pos, pos, node)
              : view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr.scrollIntoView());
        })
        .catch((error: unknown) =>
          report(view, error instanceof Error ? error.message : 'Upload failed.'),
        );
    }
    return true;
  };

  /** Command: upload files chosen by the user (e.g. from a file picker). */
  const uploadImages =
    (files: readonly File[]): EditorCommand =>
    (_state, dispatch, view) => {
      if (!view) return false;
      if (!dispatch) return true;
      return uploadFiles(view, files);
    };

  return definePlugin({
    name: 'image',
    nodes: {
      image: {
        inline: true,
        group: 'inline',
        atom: true,
        selectable: true,
        draggable: true,
        attrs: {
          src: { validate: 'string' },
          alt: { default: '', validate: 'string' },
          width: { default: null },
          wrap: { default: 'inline', validate: 'string' },
          caption: { default: '', validate: 'string' },
        },
        // Copying an image as plain text gives its description.
        leafText: (node) => (node.attrs['alt'] as string) || '[image]',
        parseDOM: [
          {
            tag: 'span.ax-image',
            getAttrs: (dom) => {
              const img = (dom as HTMLElement).querySelector('img');
              return img ? attrsFromImg(img, dom as HTMLElement) : false;
            },
          },
          {
            // Figures from other editors / older AxiomText HTML.
            tag: 'figure',
            getAttrs: (dom) => {
              const img = (dom as HTMLElement).querySelector('img');
              return img ? attrsFromImg(img, dom as HTMLElement) : false;
            },
          },
          { tag: 'img[src]', getAttrs: (dom) => attrsFromImg(dom as HTMLElement) },
        ],
        toDOM: (node) => {
          const { src, alt, width, wrap, caption } = node.attrs as {
            src: string;
            alt: string;
            width: number | null;
            wrap: ImageWrap;
            caption: string;
          };
          return [
            'span',
            {
              class: 'ax-image',
              'data-wrap': wrap,
              ...(width ? { style: `width: ${width}%;` } : {}),
            },
            ['img', { src: sanitizeImageSrc(src) ?? '', alt }],
            ...(caption ? [['span', { class: 'ax-image__caption' }, caption] as const] : []),
          ];
        },
      },
    },
    commands: { insertImage, updateImage, deleteImage, uploadImages, moveImage },
    // Runs before the default Enter, which would replace a selected image.
    keymap: () => ({ Enter: newLineAfterImage, Escape: caretAfterImage }),
    enginePlugins: () => [
      imageKeyboardPlugin({ arrowKeysMove: options.arrowKeysMove ?? true }),
      dissolveEmptyLayouts(),
      new Plugin({
        props: {
          nodeViews: { image: (node, view, getPos) => new ImageView(node, view, getPos) },
          // MED-001 / CLP-007: paste screenshots and image files.
          handlePaste: (view, event) => {
            const files = [...(event.clipboardData?.files ?? [])];
            return files.length > 0 && uploadFiles(view, files);
          },
          // MED-001: drag images from the desktop — dropped exactly where the mouse is.
          handleDrop: (view, event, _slice, moved) => {
            if (moved) return false;
            const files = [...(event.dataTransfer?.files ?? [])];
            if (files.length === 0) return false;
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            event.preventDefault();
            return uploadFiles(view, files, coords?.pos);
          },
        },
      }),
    ],
    messages: {
      en: {
        'image.insert': 'Image',
        'image.upload': 'Upload from computer',
        'image.alt': 'Alternative text',
        'image.caption': 'Caption',
        'image.wrap.inline': 'In line with text',
        'image.wrap.left': 'Wrap text — image left',
        'image.wrap.right': 'Wrap text — image right',
        'image.wrap.block': 'Break text',
        'image.move.hint': 'Use arrow keys to move the image',
      },
    },
  });
}

/** Image plugin with the default base64 adapter (no server needed). */
export const Image = createImagePlugin();
