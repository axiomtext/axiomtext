// Code block look for the docs (Expressive Code, used by Starlight).
import { defineEcConfig } from '@astrojs/starlight/expressive-code';

export default defineEcConfig({
  themes: ['github-dark-default', 'github-light'],
  styleOverrides: {
    borderRadius: '0.75rem',
    borderColor: 'var(--sl-color-hairline)',
    codeFontFamily: 'var(--sl-font-mono)',
    codeFontSize: '0.875rem',
    codeLineHeight: '1.7',
    uiFontFamily: 'var(--sl-font)',
    frames: {
      shadowColor: 'transparent',
      editorActiveTabIndicatorTopColor: 'var(--sl-color-accent)',
    },
  },
});
