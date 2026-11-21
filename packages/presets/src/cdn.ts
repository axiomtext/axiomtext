/**
 * CDN entry: everything in one place, for `<script>` and `<script type="module">` users.
 * Built to dist/cdn/axiomtext.js (ES module, math loads on demand) and
 * dist/cdn/axiomtext.iife.js (classic script, global `AxiomText`, everything included).
 */
import type * as Convert from '@axiomtext/convert';
import type { Messages } from '@axiomtext/ui';

type MarkdownModule = typeof Convert;

export {
  ALL_PLUGINS,
  createBalloonEditor,
  createClassicEditor,
  createInlineEditor,
  setLanguage,
  setIcons,
  DEFAULT_TOOLBAR,
  BALLOON_TOOLBAR,
} from './index';
export type * from './index';

/**
 * Markdown import/export, loaded on first use (it's ~40 KB gzip):
 *   const { toMarkdown, fromMarkdown } = await AxiomText.loadMarkdown();
 */
export const loadMarkdown = (): Promise<MarkdownModule> => import('@axiomtext/convert');
export { MathPlugin } from '@axiomtext/math';

const LOCALES: Record<string, () => Promise<{ default: Messages }>> = {
  ar: () => import('@axiomtext/ui/locales/ar'),
  bn: () => import('@axiomtext/ui/locales/bn'),
  de: () => import('@axiomtext/ui/locales/de'),
  es: () => import('@axiomtext/ui/locales/es'),
  fr: () => import('@axiomtext/ui/locales/fr'),
  hi: () => import('@axiomtext/ui/locales/hi'),
  ja: () => import('@axiomtext/ui/locales/ja'),
  pt: () => import('@axiomtext/ui/locales/pt'),
  zh: () => import('@axiomtext/ui/locales/zh'),
};

/** UI languages available besides English. */
export const LANGUAGES = Object.keys(LOCALES);

/** Loads the UI texts for a language (`'bn'`, `'ar'`, …), for the `translations` option. */
export async function loadTranslations(language: string): Promise<Messages | undefined> {
  const base = language.split(/[-_]/)[0] ?? language;
  const load = LOCALES[language] ?? LOCALES[base];
  return load ? (await load()).default : undefined;
}
