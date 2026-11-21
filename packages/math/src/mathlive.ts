import { trustedTypesEnforced } from '@axiomtext/core';
import type * as MathLiveNamespace from 'mathlive';
import type { MathfieldElement } from 'mathlive';

type MathLiveModule = typeof MathLiveNamespace;

let loading: Promise<MathLiveModule | null> | null = null;
let customLoader: (() => Promise<MathLiveModule | null>) | null = null;

/**
 * Replace how MathLive is loaded, e.g. from a local `<script>` in a WebView where ES module
 * imports from files aren't available (the Flutter SDK does this).
 */
export function setMathLiveLoader(loader: (() => Promise<MathLiveModule | null>) | null): void {
  customLoader = loader;
  loading = null;
}

/**
 * Loads MathLive (visual equation editing) on first use.
 * Resolves to null if it can't load (old browser, blocked script): the editor then falls back to LaTeX input.
 */
export function loadMathLive(): Promise<MathLiveModule | null> {
  // MathLive writes innerHTML itself, which pages enforcing Trusted Types block. There the
  // visual editor is skipped and equations are edited as LaTeX instead.
  if (trustedTypesEnforced()) return Promise.resolve(null);
  loading ??= (customLoader ? customLoader() : import('mathlive'))
    .then((mod) => {
      if (!mod) return null;
      const MF = mod.MathfieldElement;
      // MathLive uses the KaTeX font families, which the page already loads with katex.min.css,
      // so it never fetches fonts or sounds from the network (keeps strict CSP + privacy).
      MF.fontsDirectory = null;
      MF.soundsDirectory = null;
      MF.plonkSound = null;
      MF.keypressSound = null;
      return mod;
    })
    .catch(() => null);
  return loading;
}

export type { MathfieldElement };
