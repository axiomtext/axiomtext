/** True on macOS / iOS, where "Mod" means ⌘ instead of Ctrl. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Formats a ProseMirror-style key binding for display.
 * `Mod-Shift-x` → `⌘⇧X` on Apple platforms, `Ctrl+Shift+X` elsewhere.
 */
export function formatShortcut(binding: string, apple = isApplePlatform()): string {
  const parts = binding.split('-');
  const key = parts.pop() ?? '';
  const mods = parts.map((m) => {
    switch (m) {
      case 'Mod':
        return apple ? '⌘' : 'Ctrl';
      case 'Shift':
        return apple ? '⇧' : 'Shift';
      case 'Alt':
        return apple ? '⌥' : 'Alt';
      case 'Ctrl':
        return apple ? '⌃' : 'Ctrl';
      default:
        return m;
    }
  });
  const keyLabel = key.length === 1 ? key.toUpperCase() : key;
  return apple ? [...mods, keyLabel].join('') : [...mods, keyLabel].join('+');
}
