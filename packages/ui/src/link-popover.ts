import { t } from '@axiomtext/i18n';
import type { Editor } from '@axiomtext/view';
import { h } from './dom';
import { icon } from './icons';

export interface LinkUI {
  /** Opens the "insert / edit link" form at the selection. */
  open(): void;
  destroy(): void;
}

const placeAt = (el: HTMLElement, rect: { bottom: number; left: number }): void => {
  const width = el.offsetWidth || 320;
  el.style.top = `${rect.bottom + 8}px`;
  el.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
};

/**
 * Link editing UI (LNK-001, UI-003):
 * - a form popover (Ctrl/⌘+K or the toolbar button) with URL validation,
 * - a balloon that appears when the cursor is inside a link (open, edit, unlink).
 */
export function createLinkUI(editor: Editor): LinkUI {
  // ── Form popover ─────────────────────────────────────
  const input = h('input', {
    // type="text" + inputmode: browsers would otherwise reject "example.com" (no scheme).
    type: 'text',
    inputmode: 'url',
    class: 'ax-popover__input',
    placeholder: 'Paste or type a link',
    'aria-label': 'Link URL',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const error = h('div', { class: 'ax-popover__error', role: 'status' });
  const apply = h('button', { type: 'submit', class: 'ax-popover__button is-primary' }, ['Apply']);
  const remove = h('button', { type: 'button', class: 'ax-popover__button' }, ['Remove']);
  const form = h(
    'form',
    {
      class: 'ax-popover ax-link-form',
      role: 'dialog',
      'aria-label': 'Edit link',
      novalidate: true,
    },
    [
      h('div', { class: 'ax-popover__row' }, [icon('link', 16), input, apply]),
      error,
      h('div', { class: 'ax-popover__row is-end' }, [remove]),
    ],
  );

  // ── Balloon ──────────────────────────────────────────
  const hrefLabel = h('a', {
    class: 'ax-link-balloon__href',
    target: '_blank',
    rel: 'noopener noreferrer',
  });
  const editBtn = h(
    'button',
    { type: 'button', class: 'ax-button', 'aria-label': 'Edit link', 'data-tooltip': 'Edit link' },
    [icon('pencil', 16)],
  );
  const unlinkBtn = h(
    'button',
    {
      type: 'button',
      class: 'ax-button',
      'aria-label': 'Remove link',
      'data-tooltip': 'Remove link',
    },
    [icon('unlink', 16)],
  );
  const balloon = h(
    'div',
    { class: 'ax-popover ax-link-balloon', role: 'toolbar', 'aria-label': 'Link' },
    [icon('externalLink', 14), hrefLabel, editBtn, unlinkBtn],
  );

  let formOpen = false;

  const closeForm = (refocus: boolean): void => {
    if (!formOpen) return;
    formOpen = false;
    form.classList.remove('is-open');
    form.remove();
    document.removeEventListener('pointerdown', onOutside, true);
    if (refocus) editor.focus();
  };

  function onOutside(event: Event): void {
    if (!form.contains(event.target as Node)) closeForm(false);
  }

  const open = (): void => {
    if (!editor.commandNames.includes('setLink')) return;
    hideBalloon();
    const current = editor.getMarkAttrs('link');
    input.value = typeof current?.['href'] === 'string' ? current['href'] : '';
    remove.hidden = !current;
    error.textContent = '';
    document.body.append(form);
    placeAt(form, editor.getSelectionRect());
    formOpen = true;
    requestAnimationFrame(() => form.classList.add('is-open'));
    document.addEventListener('pointerdown', onOutside, true);
    input.focus();
    input.select();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (value === '') {
      editor.execute('unsetLink');
      closeForm(true);
      return;
    }
    if (!editor.can('setLink', value)) {
      error.textContent = t("This link isn't allowed. Use a web address like https://example.com");
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    input.removeAttribute('aria-invalid');
    editor.execute('setLink', value);
    closeForm(true);
  });
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeForm(true);
    }
  });
  remove.addEventListener('click', () => {
    editor.execute('unsetLink');
    closeForm(true);
  });

  // ── Balloon behaviour ────────────────────────────────
  const hideBalloon = (): void => {
    balloon.classList.remove('is-open');
    balloon.remove();
  };
  const updateBalloon = (): void => {
    const attrs = editor.getMarkAttrs('link');
    const href = typeof attrs?.['href'] === 'string' ? attrs['href'] : null;
    if (!href || formOpen || !editor.hasFocus()) {
      if (!balloon.contains(document.activeElement)) hideBalloon();
      return;
    }
    hrefLabel.textContent = href.replace(/^https?:\/\//, '').replace(/^mailto:/, '');
    hrefLabel.setAttribute('href', href);
    hrefLabel.title = href;
    if (!balloon.isConnected) document.body.append(balloon);
    placeAt(balloon, editor.getSelectionRect());
    requestAnimationFrame(() => balloon.classList.add('is-open'));
  };
  balloon.addEventListener('mousedown', (e) => {
    if (e.target !== hrefLabel) e.preventDefault();
  });
  editBtn.addEventListener('click', open);
  unlinkBtn.addEventListener('click', () => {
    editor.execute('unsetLink');
    hideBalloon();
    editor.focus();
  });

  // Ctrl/⌘+K opens the form, like Google Docs, Word and CKEditor.
  const onKeydown = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    }
  };
  editor.dom.addEventListener('keydown', onKeydown);
  const offUpdate = editor.on('update', updateBalloon);
  const offBlur = editor.on('blur', () => setTimeout(updateBalloon, 0));

  return {
    open,
    destroy() {
      closeForm(false);
      hideBalloon();
      offUpdate();
      offBlur();
      editor.dom.removeEventListener('keydown', onKeydown);
    },
  };
}
