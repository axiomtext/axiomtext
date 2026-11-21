import { t } from '@axiomtext/i18n';
export interface Popover {
  readonly element: HTMLElement;
  close(): void;
  reposition(): void;
}

export interface PopoverOptions {
  anchor: HTMLElement | (() => { left: number; top: number; bottom: number; right: number });
  className?: string;
  label: string;
  role?: 'dialog' | 'menu' | 'listbox' | 'toolbar';
  /** Placement relative to the anchor. */
  placement?: 'below' | 'above';
  onClose?: () => void;
}

let openPopover: Popover | null = null;

/** Floating panel attached to an anchor; closes on outside click, Escape or scroll-away. */
export function openPopoverPanel(content: HTMLElement[], options: PopoverOptions): Popover {
  openPopover?.close();
  const element = document.createElement('div');
  element.className = `ax-popover ${options.className ?? ''}`.trim();
  element.setAttribute('role', options.role ?? 'dialog');
  element.setAttribute('aria-label', t(options.label));
  element.append(...content);
  document.body.append(element);

  const rectOf = () =>
    typeof options.anchor === 'function'
      ? options.anchor()
      : options.anchor.getBoundingClientRect();

  const reposition = (): void => {
    const rect = rectOf();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    element.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    const below = rect.bottom + 6;
    const above = rect.top - height - 6;
    const preferAbove = options.placement === 'above';
    const top = preferAbove
      ? above > 8
        ? above
        : below
      : below + height > window.innerHeight && above > 8
        ? above
        : below;
    element.style.top = `${top}px`;
  };

  const onPointerDown = (event: PointerEvent): void => {
    const target = event.target as Node;
    const anchorEl = typeof options.anchor === 'function' ? null : options.anchor;
    if (!element.contains(target) && !anchorEl?.contains(target)) popover.close();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      popover.close();
      if (typeof options.anchor !== 'function') options.anchor.focus();
    }
  };

  const popover: Popover = {
    element,
    reposition,
    close() {
      if (!element.isConnected) return;
      document.removeEventListener('pointerdown', onPointerDown, true);
      element.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      element.remove();
      if (openPopover === popover) openPopover = null;
      options.onClose?.();
    },
  };
  document.addEventListener('pointerdown', onPointerDown, true);
  element.addEventListener('keydown', onKey);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  reposition();
  requestAnimationFrame(() => element.classList.add('is-open'));
  openPopover = popover;
  return popover;
}
