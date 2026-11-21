/* global localStorage, document */
// Runs before the page is painted, so a saved theme shows immediately (no light → dark flash).
try {
  const theme = localStorage.getItem('axiomtext-playground-theme');
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
} catch {
  /* storage unavailable: the system theme is used */
}
