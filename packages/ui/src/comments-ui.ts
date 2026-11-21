/**
 * Comments UI (COL-001…006): the composer, thread balloons on click, and the comments panel.
 * Loaded on demand when an editor is created with the `comments` option.
 */
import { getLanguage, t } from '@axiomtext/i18n';
import { colorStyle, listCommentThreads } from '@axiomtext/plugin-comments/data';
import type { CommentEntry, CommentThreadSummary } from '@axiomtext/plugin-comments/data';
import { avatar, createColorPicker, setHighlightVars, swatchColor } from '@axiomtext/viewer/picker';
import type { ColorChoice } from '@axiomtext/viewer/picker';
import type { Editor } from '@axiomtext/view';
import { h } from './dom';
import { icon } from './icons';
import { openPopoverPanel } from './popover';
import type { Popover } from './popover';
import type { CommentsOptions } from './setup';

export interface CommentsUI {
  /** Opens the box for a new comment on the selected text. */
  openComposer(): void;
  /** Shows a thread (and any threads overlapping it) next to its text. */
  openThread(id: string): void;
  /** Shows or hides the list of all threads. */
  togglePanel(open?: boolean): void;
  /** All threads, in reading order. */
  readonly threads: CommentThreadSummary[];
  destroy(): void;
}

const text = (value: string): Text => document.createTextNode(value);

/** "5 min ago", "yesterday", in the interface language. */
export function relativeTime(time: number, now = Date.now()): string {
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  const format = new Intl.RelativeTimeFormat(getLanguage().locale, { numeric: 'auto' });
  if (abs < 45) return t('just now');
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return format.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 7) return format.format(Math.round(seconds / 86400), 'day');
  return new Intl.DateTimeFormat(getLanguage().locale, { dateStyle: 'medium' }).format(time);
}

/** Wraps content so it can slide open and closed (`is-open`); closed content is inert. */
function collapsible(content: HTMLElement, inert = true): HTMLElement {
  return h('div', { class: 'ax-collapse', inert }, [h('div', {}, [content])]);
}

/** A quote in the panel, tinted with its thread's colour. */
function quoteChip(color: CommentThreadSummary['color'], quote: string): HTMLElement {
  const chip = h('span', { class: 'ax-comment-card__quote', 'data-color': color }, [text(quote)]);
  const custom = colorStyle(color);
  if (custom) {
    chip.setAttribute('data-color', 'custom');
    chip.setAttribute('style', custom);
  }
  return chip;
}

/** Grows a textarea with its content; Ctrl/⌘+Enter submits. */
function autosizeTextarea(area: HTMLTextAreaElement, onSubmit: () => void): void {
  const fit = (): void => {
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, 200)}px`;
  };
  area.addEventListener('input', fit);
  area.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  });
  requestAnimationFrame(fit);
}

export function createCommentsUI(
  editor: Editor,
  options: CommentsOptions,
  /** Where the panel goes when the app gives no container. */
  panelHost: HTMLElement,
): CommentsUI {
  const author = options.author;
  let popover: Popover | null = null;
  let activeIds: string[] = [];
  let lastSignature = '';
  let threads: CommentThreadSummary[] = [];
  // The composer starts with the colour picked last time.
  let lastChoice: ColorChoice = { color: 'yellow', fill: true };

  const readThreads = (): CommentThreadSummary[] => listCommentThreads(editor.getJSON());
  const canChange = (entry: CommentEntry): boolean =>
    options.moderator === true ||
    (!!author.id && entry.authorId === author.id) ||
    (!author.id && !entry.authorId && entry.author === author.name);

  // The active thread is shown with an editor decoration: the editor's DOM is never changed
  // directly (the engine would treat that as an edit).
  const markActive = (ids: string[]): void => {
    activeIds = ids;
    editor.execute('setActiveComments', ids);
  };

  const selectionRect = (): { left: number; top: number; bottom: number; right: number } => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width || rect.height) return rect;
    }
    return (editor.getSelectionElement() ?? editor.dom).getBoundingClientRect();
  };

  // ── New comment ────────────────────────────────────────────────
  const openComposer = (): void => {
    if (editor.getSelectionState().empty) return;
    const rect = selectionRect();
    const quoteText = (window.getSelection()?.toString() ?? '').trim();
    const area = h('textarea', {
      class: 'ax-comment-input',
      rows: '2',
      placeholder: 'Add a comment…',
      'aria-label': 'Comment',
    });
    // The highlight style sits behind a small button showing the current colour.
    const swatch = h('span', { class: 'ax-style-button__swatch', 'aria-hidden': 'true' });
    const styleButton = h(
      'button',
      {
        type: 'button',
        class: 'ax-style-button',
        'aria-expanded': 'false',
        'aria-label': 'Highlight color',
        title: 'Highlight color',
      },
      [swatch, icon('chevronDown', 14)],
    );
    const paintSwatch = (): void => {
      setHighlightVars(swatch, lastChoice.color);
      swatch.classList.toggle('is-line', !lastChoice.fill);
    };
    const colors = createColorPicker({
      value: lastChoice,
      onChange: (v) => {
        lastChoice = v;
        paintSwatch();
        setHighlightVars(quote, v.color);
        quote.toggleAttribute('data-line', !v.fill);
      },
    });
    const styleBox = collapsible(colors.element);
    styleBox.addEventListener('transitionend', () => popover?.reposition());
    styleButton.addEventListener('click', () => {
      const open = !styleBox.classList.contains('is-open');
      styleBox.classList.toggle('is-open', open);
      styleBox.toggleAttribute('inert', !open);
      styleButton.setAttribute('aria-expanded', String(open));
      popover?.reposition();
    });
    const quote = h('q', { class: 'ax-thread__quote' }, [text(quoteText)]);
    setHighlightVars(quote, lastChoice.color);
    quote.toggleAttribute('data-line', !lastChoice.fill);
    paintSwatch();
    const submit = h(
      'button',
      { type: 'submit', class: 'ax-popover__button is-primary', disabled: true },
      ['Comment'],
    );
    const cancel = h('button', { type: 'button', class: 'ax-popover__button' }, ['Cancel']);
    const form = h('form', { class: 'ax-comment-form ax-comment-composer', novalidate: true }, [
      h('div', { class: 'ax-comment-composer__who' }, [
        avatar(author.name, 28),
        h('strong', {}, [text(author.name)]),
      ]),
      ...(quoteText ? [quote] : []),
      area,
      styleBox,
      h('div', { class: 'ax-comment-actions' }, [
        styleButton,
        h('span', { class: 'ax-spacer' }),
        cancel,
        submit,
      ]),
    ]);
    const send = (): void => {
      const body = area.value.trim();
      if (!body) return;
      const ok = editor.execute('addComment', { text: body, author, ...colors.value() });
      popover?.close();
      if (ok) editor.focus();
    };
    area.addEventListener('input', () => {
      submit.disabled = area.value.trim() === '';
    });
    autosizeTextarea(area, send);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      send();
    });
    cancel.addEventListener('click', () => {
      popover?.close();
      editor.focus();
    });
    popover = openPopoverPanel([form], {
      anchor: () => rect,
      className: 'ax-comment-popover',
      label: 'Add a comment',
    });
    area.focus();
  };

  // ── Thread balloon ─────────────────────────────────────────────
  const renderEntry = (
    threadId: string,
    entry: CommentEntry,
    isFirst: boolean,
    rerender: () => void,
  ): HTMLElement => {
    const time = h(
      'time',
      {
        datetime: new Date(entry.time).toISOString(),
        title: new Date(entry.time).toLocaleString(getLanguage().locale),
      },
      [text(entry.time ? relativeTime(entry.time) : '')],
    );
    const name = entry.author || t('Someone');
    const meta = h('div', { class: 'ax-comment__meta' }, [
      h('strong', {}, [text(name)]),
      time,
      ...(entry.edited ? [h('span', { class: 'ax-comment__edited' }, ['edited'])] : []),
    ]);
    const body = h('p', { class: 'ax-comment__text' }, [text(entry.text)]);
    const item = h('li', { class: 'ax-comment' }, [
      avatar(name, 28),
      h('div', { class: 'ax-comment__main' }, [meta, body]),
    ]);
    if (canChange(entry)) {
      const edit = h(
        'button',
        { type: 'button', class: 'ax-icon-button', 'aria-label': 'Edit', title: 'Edit' },
        [icon('edit', 15)],
      );
      const remove = h(
        'button',
        {
          type: 'button',
          class: 'ax-icon-button',
          'aria-label': isFirst ? 'Delete thread' : 'Delete',
          title: isFirst ? 'Delete thread' : 'Delete',
        },
        [icon('trash', 15)],
      );
      edit.addEventListener('click', () => {
        const area = h('textarea', {
          class: 'ax-comment-input',
          rows: '2',
          'aria-label': 'Edit comment',
        });
        area.value = entry.text;
        const save = h('button', { type: 'submit', class: 'ax-popover__button is-primary' }, [
          'Save',
        ]);
        const cancel = h('button', { type: 'button', class: 'ax-popover__button' }, ['Cancel']);
        const form = h('form', { class: 'ax-comment-form' }, [
          area,
          h('div', { class: 'ax-comment-actions' }, [cancel, save]),
        ]);
        const done = (): void => {
          editor.execute('editComment', threadId, entry.id, area.value);
          rerender();
        };
        autosizeTextarea(area, done);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          done();
        });
        cancel.addEventListener('click', rerender);
        body.replaceWith(form);
        area.focus();
      });
      remove.addEventListener('click', () => {
        editor.execute(isFirst ? 'deleteCommentThread' : 'deleteComment', threadId, entry.id);
        rerender();
      });
      meta.append(h('span', { class: 'ax-comment__tools' }, [edit, remove]));
    }
    return item;
  };

  const renderThread = (thread: CommentThreadSummary, rerender: () => void): HTMLElement => {
    const section = h('section', {
      class: `ax-thread${thread.resolved ? ' is-resolved' : ''}`,
      'data-thread-id': thread.id,
      'aria-label': 'Comment thread',
    });
    setHighlightVars(section, thread.color);
    section.toggleAttribute('data-line', !thread.fill);
    const resolve = h(
      'button',
      {
        type: 'button',
        class: 'ax-icon-button',
        'aria-label': thread.resolved ? 'Reopen' : 'Resolve',
        title: thread.resolved ? 'Reopen' : 'Resolve',
      },
      [icon(thread.resolved ? 'reopen' : 'resolve', 16)],
    );
    resolve.addEventListener('click', () => {
      editor.execute('resolveComment', thread.id, !thread.resolved);
      rerender();
    });
    const dot = h('span', {
      class: `ax-thread__dot${thread.fill ? '' : ' is-line'}`,
      'aria-hidden': 'true',
    });
    dot.style.setProperty('--ax-dot', swatchColor(thread.color));
    const style = h(
      'button',
      {
        type: 'button',
        class: 'ax-icon-button ax-thread__style',
        'aria-label': 'Highlight color',
        title: 'Highlight color',
        'aria-expanded': 'false',
      },
      [dot],
    );
    const header = h('header', { class: 'ax-thread__header' }, [
      h('q', { class: 'ax-thread__quote' }, [text(thread.quote.trim())]),
      h('span', { class: 'ax-thread__actions' }, [style, resolve]),
    ]);
    const picker = createColorPicker({
      value: { color: thread.color, fill: thread.fill },
      onChange: (v) => {
        if (v.color !== thread.color) editor.execute('setCommentColor', thread.id, v.color);
        if (v.fill !== thread.fill) editor.execute('setCommentFill', thread.id, v.fill);
        thread.color = v.color;
        thread.fill = v.fill;
        setHighlightVars(section, v.color);
        section.toggleAttribute('data-line', !v.fill);
        dot.style.setProperty('--ax-dot', swatchColor(v.color));
        dot.classList.toggle('is-line', !v.fill);
      },
    });
    picker.element.classList.add('ax-thread__picker');
    const pickerBox = collapsible(picker.element);
    pickerBox.addEventListener('transitionend', () => popover?.reposition());
    style.addEventListener('click', () => {
      const open = !pickerBox.classList.contains('is-open');
      pickerBox.classList.toggle('is-open', open);
      pickerBox.toggleAttribute('inert', !open);
      style.setAttribute('aria-expanded', String(open));
      popover?.reposition();
    });
    const list = h('ol', { class: 'ax-thread__comments' });
    thread.comments.forEach((entry, i) =>
      list.append(renderEntry(thread.id, entry, i === 0, rerender)),
    );
    const area = h('textarea', {
      class: 'ax-comment-input',
      rows: '1',
      placeholder: 'Reply…',
      'aria-label': 'Reply',
    });
    const send = h(
      'button',
      { type: 'submit', class: 'ax-popover__button is-primary', disabled: true },
      ['Reply'],
    );
    const form = h('form', { class: 'ax-comment-form ax-comment-form--reply', novalidate: true }, [
      h('div', { class: 'ax-comment-reply' }, [avatar(author.name, 28), area]),
      collapsible(h('div', { class: 'ax-comment-actions' }, [send]), false),
    ]);
    const actions = form.lastElementChild as HTMLElement;
    const showActions = (): void => {
      actions.classList.toggle('is-open', document.activeElement === area || area.value !== '');
      popover?.reposition();
    };
    area.addEventListener('focus', showActions);
    area.addEventListener('blur', () => setTimeout(showActions, 150));
    const reply = (): void => {
      if (!area.value.trim()) return;
      editor.execute('replyToComment', thread.id, area.value, author);
      rerender();
    };
    area.addEventListener('input', () => {
      send.disabled = area.value.trim() === '';
    });
    autosizeTextarea(area, reply);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      reply();
    });
    section.append(header, ...(thread.resolved ? [] : [pickerBox]), list, form);
    return section;
  };

  const openThreads = (ids: string[], anchor: HTMLElement): void => {
    const render = (): HTMLElement[] => {
      const all = readThreads();
      return ids.flatMap((id) => {
        const thread = all.find((x) => x.id === id);
        return thread ? [renderThread(thread, rerender)] : [];
      });
    };
    const rerender = (): void => {
      if (!popover) return;
      const content = render();
      if (!content.length) {
        popover.close();
        return;
      }
      popover.element.replaceChildren(...content);
      popover.reposition();
    };
    const content = render();
    if (!content.length) return;
    markActive(ids);
    // The editor redraws a highlight when its colour changes: follow the current element.
    const live = (): HTMLElement =>
      (anchor.isConnected ? anchor : null) ??
      editor.dom.querySelector<HTMLElement>(
        `mark.ax-comment[data-comment-id="${CSS.escape(ids[0] ?? '')}"]`,
      ) ??
      anchor;
    popover = openPopoverPanel(content, {
      anchor: () => live().getBoundingClientRect(),
      className: 'ax-thread-popover',
      label: 'Comments',
      onClose: () => markActive([]),
    });
  };

  const openThread = (id: string): void => {
    editor.execute('selectComment', id);
    const anchor = editor.dom.querySelector<HTMLElement>(
      `mark.ax-comment[data-comment-id="${CSS.escape(id)}"]`,
    );
    if (anchor) openThreads([id], anchor);
  };

  const onClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const first = target?.closest<HTMLElement>('mark.ax-comment');
    if (!first || !editor.dom.contains(first)) return;
    // All threads under the pointer (comments can overlap).
    const ids: string[] = [];
    for (let el: Element | null = first; el && editor.dom.contains(el); el = el.parentElement) {
      if (el.matches('mark.ax-comment') && el.getAttribute('data-resolved') !== 'true') {
        const id = el.getAttribute('data-comment-id');
        if (id && !ids.includes(id)) ids.push(id);
      }
    }
    if (ids.length) openThreads(ids, first);
  };
  editor.dom.addEventListener('click', onClick);

  // ── Panel ──────────────────────────────────────────────────────
  const panel = h('aside', { class: 'ax-comments-panel', 'aria-label': 'Comments', hidden: true });
  let tab: 'open' | 'resolved' = 'open';
  const inOwnContainer = !!options.panel;
  (options.panel ?? panelHost).append(panel);
  if (inOwnContainer) panel.classList.add('is-embedded');

  // Built once so the tab indicator can slide between tabs.
  const close = h(
    'button',
    { type: 'button', class: 'ax-icon-button', 'aria-label': 'Close', title: 'Close' },
    [icon('close', 16)],
  );
  close.addEventListener('click', () => togglePanel(false));
  const count = h('span', { class: 'ax-count', 'aria-hidden': 'true' });
  const tabs = h('div', { class: 'ax-comments-panel__tabs', role: 'tablist' });
  const tabButtons = (['open', 'resolved'] as const).map((name) => {
    const button = h('button', { type: 'button', role: 'tab', class: 'ax-comments-panel__tab' });
    button.addEventListener('click', () => {
      tab = name;
      renderPanel();
    });
    tabs.append(button);
    return button;
  });
  const body = h('div', { class: 'ax-comments-panel__body' });
  panel.append(
    h('header', { class: 'ax-comments-panel__header' }, [
      h('h2', {}, ['Comments', count]),
      ...(inOwnContainer ? [] : [close]),
    ]),
    tabs,
    body,
  );

  const renderPanel = (): void => {
    const open = threads.filter((x) => !x.resolved);
    const resolved = threads.filter((x) => x.resolved);
    count.textContent = String(open.length);
    count.hidden = open.length === 0;
    tabs.style.setProperty('--ax-tab', tab === 'open' ? '0' : '1');
    [
      ['Open', open.length],
      ['Resolved', resolved.length],
    ].forEach(([label, n], i) => {
      const button = tabButtons[i];
      if (!button) return;
      button.textContent = `${t(String(label))} (${n})`;
      button.setAttribute('aria-selected', String((i === 0) === (tab === 'open')));
    });
    const shown = tab === 'open' ? open : resolved;
    const list = h('ul', { class: 'ax-comments-panel__list' });
    for (const thread of shown) {
      const first = thread.comments[0];
      const name = first?.author || t('Someone');
      const replies = thread.comments.length - 1;
      const card = h(
        'button',
        {
          type: 'button',
          class: `ax-comment-card${activeIds.includes(thread.id) ? ' is-active' : ''}${thread.resolved ? ' is-resolved' : ''}`,
          'data-thread-id': thread.id,
        },
        [
          h('span', { class: 'ax-comment-card__head' }, [
            avatar(name, 24),
            h('span', { class: 'ax-comment-card__meta' }, [
              h('strong', {}, [text(name)]),
              text(first?.time ? relativeTime(first.time) : ''),
            ]),
            ...(thread.resolved
              ? [h('span', { class: 'ax-comment-card__badge' }, [icon('resolve', 14)])]
              : []),
          ]),
          quoteChip(thread.color, thread.quote.trim()),
          h('span', { class: 'ax-comment-card__text' }, [text(first?.text ?? '')]),
          ...(replies > 0
            ? [
                h('span', { class: 'ax-comment-card__replies' }, [
                  icon('comments', 13),
                  t(replies === 1 ? '{count} reply' : '{count} replies', { count: replies }),
                ]),
              ]
            : []),
        ],
      );
      card.addEventListener('click', () => {
        if (thread.resolved) {
          editor.execute('resolveComment', thread.id, false);
          tab = 'open';
        }
        openThread(thread.id);
      });
      list.append(h('li', {}, [card]));
    }
    const empty = h('div', { class: 'ax-comments-panel__empty' }, [
      h('span', { class: 'ax-comments-panel__empty-icon' }, [icon('comments', 22)]),
      h('p', {}, [
        tab === 'open'
          ? 'No open comments. Select text, then press Comment.'
          : 'No resolved comments.',
      ]),
    ]);
    body.replaceChildren(shown.length ? list : empty);
  };

  const togglePanel = (force?: boolean): void => {
    const open = force ?? panel.hidden;
    panel.hidden = !open;
    panelHost.classList.toggle('has-comments-panel', open && !inOwnContainer);
    if (open) {
      panel.classList.add('is-entering');
      setTimeout(() => panel.classList.remove('is-entering'), 500);
      renderPanel();
    }
  };

  // ── Changes ────────────────────────────────────────────────────
  const refresh = (): void => {
    threads = readThreads();
    const signature = JSON.stringify(threads);
    if (signature === lastSignature) return;
    lastSignature = signature;
    if (!panel.hidden) renderPanel();
    options.onChange?.(threads);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const offChange = editor.on('change', () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, 150);
  });
  threads = readThreads();
  lastSignature = JSON.stringify(threads);
  if (options.panelOpen || inOwnContainer) togglePanel(true);

  const onKey = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() === 'm' && event.altKey && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      openComposer();
    }
  };
  editor.dom.addEventListener('keydown', onKey);

  return {
    openComposer,
    openThread,
    togglePanel,
    get threads() {
      return threads;
    },
    destroy() {
      clearTimeout(timer);
      offChange();
      popover?.close();
      editor.dom.removeEventListener('click', onClick);
      editor.dom.removeEventListener('keydown', onKey);
      panel.remove();
      panelHost.classList.remove('has-comments-panel');
    },
  };
}
