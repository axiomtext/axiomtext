/**
 * Page-number blocks: a small balloon to change the number when a page block is selected.
 */
import { t } from '@axiomtext/i18n';
import type { Editor } from '@axiomtext/view';
import { h } from './dom';
import { openPopoverPanel } from './popover';
import type { Popover } from './popover';

export function createPageBalloon(editor: Editor): { destroy(): void } {
  let popover: Popover | null = null;
  let shownFor: HTMLElement | null = null;

  const close = (): void => {
    popover?.close();
    popover = null;
    shownFor = null;
  };

  const open = (element: HTMLElement, number: number): void => {
    if (shownFor === element && popover) return;
    close();
    const input = h('input', {
      type: 'number',
      min: '0',
      step: '1',
      class: 'ax-page-balloon__input',
      'aria-label': 'Page number',
    });
    input.value = String(number);
    const save = h('button', { type: 'submit', class: 'ax-popover__button is-primary' }, ['Save']);
    const form = h('form', { class: 'ax-page-balloon' }, [
      h('label', { class: 'ax-page-balloon__label' }, [t('Page number'), input]),
      save,
    ]);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const n = Number(input.value);
      if (Number.isFinite(n)) editor.execute('setPageNumber', n);
      close();
      editor.focus();
    });
    shownFor = element;
    popover = openPopoverPanel([form], {
      anchor: element,
      className: 'ax-page-popover',
      label: 'Page number',
      onClose: () => {
        popover = null;
        shownFor = null;
      },
    });
  };

  const update = (): void => {
    const node = editor.getSelectedNode();
    if (node?.type === 'page' && node.element && editor.dom.isContentEditable) {
      open(node.element, Number(node.attrs['number']));
    } else if (popover && !popover.element.contains(document.activeElement)) {
      close();
    }
  };
  const off = editor.on('selectionChange', update);
  return {
    destroy() {
      off();
      close();
    },
  };
}
