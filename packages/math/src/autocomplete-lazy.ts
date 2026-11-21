/** Loads LaTeX autocomplete (its command list) only when a LaTeX field is opened. */
export function attachAutocompleteLazy(
  input: HTMLTextAreaElement,
  container: HTMLElement,
  onChange: () => void,
  enabled: () => boolean,
): { destroy(): void } {
  let handle: { destroy(): void } | null = null;
  let destroyed = false;
  void import('./autocomplete').then((m) => {
    if (!destroyed) handle = m.attachAutocomplete(input, container, onChange, enabled);
  });
  return {
    destroy() {
      destroyed = true;
      handle?.destroy();
    },
  };
}
