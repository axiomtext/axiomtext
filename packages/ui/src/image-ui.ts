import type { Editor } from '@axiomtext/view';
import { h } from './dom';
import { icon, wrapIcon } from './icons';
import type { IconName, WrapIconName } from './icons';
import { openPopoverPanel } from './popover';
import type { Popover } from './popover';

let imagePicker: (() => void) | null = null;
/**
 * Let the embedding app choose images itself (e.g. the Flutter SDK opens the phone's photo
 * picker). While set, "Upload from computer" calls it instead of the browser's file dialog.
 */
export function setImagePicker(picker: (() => void) | null): void {
  imagePicker = picker;
}

/** "Image" button: upload from the computer or insert from a URL. */
export function createImageButton(editor: Editor): { element: HTMLButtonElement; destroy(): void } {
  const button = h(
    'button',
    {
      type: 'button',
      class: 'ax-button',
      'aria-label': 'Image',
      'aria-haspopup': 'dialog',
      'data-tooltip': 'Image',
    },
    [icon('image')],
  );
  const fileInput = h('input', {
    type: 'file',
    accept: 'image/png,image/jpeg,image/gif,image/webp,image/avif',
    multiple: true,
    hidden: true,
  });
  fileInput.addEventListener('change', () => {
    const files = [...(fileInput.files ?? [])];
    fileInput.value = '';
    if (files.length) editor.execute('uploadImages', files);
    editor.focus();
  });
  let popover: Popover | null = null;

  const open = (): void => {
    const upload = h(
      'button',
      { type: 'button', class: 'ax-popover__button is-primary ax-image-upload' },
      [icon('upload', 16), 'Upload from computer'],
    );
    upload.addEventListener('click', () => {
      popover?.close();
      if (imagePicker) imagePicker();
      else fileInput.click();
    });
    const url = h('input', {
      type: 'text',
      inputmode: 'url',
      class: 'ax-popover__input',
      placeholder: 'https://… image address',
      'aria-label': 'Image URL',
    });
    const alt = h('input', {
      type: 'text',
      class: 'ax-popover__input',
      placeholder: 'Describe the image (alt text)',
      'aria-label': 'Alternative text',
    });
    const error = h('div', { class: 'ax-popover__error', role: 'status' });
    const insert = h('button', { type: 'submit', class: 'ax-popover__button' }, ['Insert']);
    const form = h('form', { class: 'ax-image-form', novalidate: true }, [
      h('div', { class: 'ax-popover__divider' }, ['or insert from a link']),
      url,
      alt,
      error,
      h('div', { class: 'ax-popover__row is-end' }, [insert]),
    ]);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!editor.can('insertImage', url.value, alt.value)) {
        error.textContent =
          "This image address isn't allowed. Use an https:// link to a PNG, JPEG, GIF, WebP or AVIF image.";
        return;
      }
      popover?.close();
      editor.execute('insertImage', url.value, alt.value);
      editor.focus();
    });
    popover = openPopoverPanel([upload, form], {
      anchor: button,
      label: 'Insert image',
      className: 'ax-image-popover',
      onClose: () => (popover = null),
    });
    upload.focus();
  };

  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('click', () => (popover ? popover.close() : open()));
  document.body.append(fileInput);
  return {
    element: button,
    destroy() {
      popover?.close();
      fileInput.remove();
    },
  };
}

interface BalloonAction {
  label: string;
  icon: IconName | `wrap:${WrapIconName}`;
  run: () => void;
  pressed?: () => boolean;
  /** Hidden when this returns false (e.g. an option needs a plugin that isn't loaded). */
  visible?: () => boolean;
}

/** Shared contextual toolbar ("balloon") shown above a selected object. */
function createBalloon(label: string): {
  element: HTMLElement;
  setActions(actions: (BalloonAction | '|')[]): void;
  showAt(target: HTMLElement): void;
  hide(): void;
} {
  const element = h('div', {
    class: 'ax-popover ax-balloon',
    role: 'toolbar',
    'aria-label': label,
  });
  element.addEventListener('mousedown', (e) => {
    if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
  });
  let actions: (BalloonAction | '|')[] = [];
  const render = (): void => {
    element.replaceChildren(
      ...actions
        .filter((action) => action === '|' || (action.visible?.() ?? true))
        .map((action) => {
          if (action === '|') return h('span', { class: 'ax-toolbar__separator' });
          const b = h(
            'button',
            {
              type: 'button',
              class: 'ax-button',
              'aria-label': action.label,
              'data-tooltip': action.label,
              ...(action.pressed ? { 'aria-pressed': String(action.pressed()) } : {}),
            },
            [
              action.icon.startsWith('wrap:')
                ? wrapIcon(action.icon.slice(5) as WrapIconName, 17)
                : icon(action.icon as IconName, 17),
            ],
          );
          if (action.pressed?.()) b.classList.add('is-active');
          b.addEventListener('click', action.run);
          return b;
        }),
    );
  };
  return {
    element,
    setActions(next) {
      actions = next;
      render();
    },
    showAt(target) {
      render();
      if (!element.isConnected) document.body.append(element);
      const rect = target.getBoundingClientRect();
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const top = rect.top - height - 8 > 64 ? rect.top - height - 8 : rect.bottom + 8;
      element.style.top = `${top}px`;
      element.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))}px`;
      requestAnimationFrame(() => element.classList.add('is-open'));
    },
    hide() {
      element.classList.remove('is-open');
      element.remove();
    },
  };
}

/** Image balloon: text wrapping, caption, alt text, delete (MED-002, MED-003). */
export function createImageBalloon(editor: Editor): { destroy(): void } {
  const balloon = createBalloon('Image');
  const attr = (name: string): unknown => editor.getSelectedNode()?.attrs[name];
  const textEditor = (field: 'alt' | 'caption', label: string, placeholder: string) => (): void => {
    const target = editor.getSelectedNode()?.element;
    if (!target) return;
    const input = h('input', {
      type: 'text',
      class: 'ax-popover__input',
      'aria-label': label,
      placeholder,
      value: String(attr(field) ?? ''),
    });
    const save = h('button', { type: 'submit', class: 'ax-popover__button is-primary' }, ['Save']);
    const form = h('form', { class: 'ax-popover__row ax-alt-form', novalidate: true }, [
      input,
      save,
    ]);
    const popover = openPopoverPanel([form], {
      anchor: target,
      label,
      className: 'ax-alt-popover',
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      editor.execute('updateImage', { [field]: input.value });
      popover.close();
      editor.focus();
    });
    input.focus();
    input.select();
  };
  const wrap = (value: string) => () => {
    editor.execute('updateImage', { wrap: value });
  };
  balloon.setActions([
    {
      label: 'In line with text',
      icon: 'wrap:wrapInline',
      run: wrap('inline'),
      pressed: () => attr('wrap') === 'inline',
    },
    {
      label: 'Wrap text, image left',
      icon: 'wrap:wrapLeft',
      run: wrap('left'),
      pressed: () => attr('wrap') === 'left',
    },
    {
      label: 'Wrap text, image right',
      icon: 'wrap:wrapRight',
      run: wrap('right'),
      pressed: () => attr('wrap') === 'right',
    },
    {
      label: 'Break text',
      icon: 'wrap:wrapBlock',
      run: wrap('block'),
      pressed: () => attr('wrap') === 'block',
    },
    {
      label: 'Text on both sides',
      icon: 'wrap:wrapBoth',
      run: wrap('both'),
      pressed: () => attr('wrap') === 'both',
      visible: () => editor.can('updateImage', { wrap: 'both' }),
    },
    '|',
    {
      label: 'Caption',
      icon: 'wrap:caption',
      run: textEditor('caption', 'Caption', 'Write a caption'),
    },
    {
      label: 'Alternative text',
      icon: 'pencil',
      run: textEditor('alt', 'Alternative text', 'Describe the image for screen readers'),
    },
    { label: 'Delete image', icon: 'trash', run: () => editor.execute('deleteImage') },
  ]);
  const update = (): void => {
    const selected = editor.getSelectedNode();
    if (selected?.type === 'image' && selected.element && editor.hasFocus()) {
      balloon.showAt(selected.element);
      balloon.element.querySelector('[aria-label="Delete image"]')?.classList.add('is-danger');
    } else {
      balloon.hide();
    }
  };
  const off = editor.on('update', update);
  const offBlur = editor.on('blur', () => setTimeout(update, 0));
  return {
    destroy() {
      off();
      offBlur();
      balloon.hide();
    },
  };
}

/** Table balloon: rows, columns, merge/split, header row, delete (TBL-002, TBL-003). */
export function createTableBalloon(editor: Editor): { destroy(): void } {
  const balloon = createBalloon('Table');
  const run = (command: string) => () => {
    editor.execute(command);
  };
  balloon.setActions([
    { label: 'Insert row above', icon: 'rowAbove', run: run('addTableRowBefore') },
    { label: 'Insert row below', icon: 'rowBelow', run: run('addTableRowAfter') },
    { label: 'Insert column left', icon: 'colLeft', run: run('addTableColumnBefore') },
    { label: 'Insert column right', icon: 'colRight', run: run('addTableColumnAfter') },
    '|',
    { label: 'Merge cells', icon: 'merge', run: run('mergeTableCells') },
    { label: 'Split cell', icon: 'split', run: run('splitTableCell') },
    { label: 'Header row', icon: 'headerRow', run: run('toggleTableHeaderRow') },
    '|',
    { label: 'Delete row', icon: 'rowBelow', run: run('deleteTableRow') },
    { label: 'Delete column', icon: 'colRight', run: run('deleteTableColumn') },
    { label: 'Delete table', icon: 'trash', run: run('deleteWholeTable') },
  ]);
  // Distinguish the two "delete" icons from the insert ones.
  const markDanger = (): void => {
    balloon.element
      .querySelectorAll<HTMLElement>('[aria-label^="Delete"]')
      .forEach((b) => b.classList.add('is-danger'));
  };
  const update = (): void => {
    const table = editor.getSelectionElement()?.closest('table');
    if (table && editor.hasFocus() && editor.isAncestor('table')) {
      balloon.showAt(table);
      markDanger();
    } else {
      balloon.hide();
    }
  };
  const off = editor.on('update', update);
  const offBlur = editor.on('blur', () => setTimeout(update, 0));
  return {
    destroy() {
      off();
      offBlur();
      balloon.hide();
    },
  };
}
