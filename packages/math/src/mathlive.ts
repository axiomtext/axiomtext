import { trustedTypesEnforced } from '@axiomtext/core';
import type * as MathLiveNamespace from 'mathlive';
import type { MathfieldElement } from 'mathlive';

type MathLiveModule = typeof MathLiveNamespace;

let loading: Promise<MathLiveModule | null> | null = null;

/**
 * Loads MathLive (visual equation editing) on first use.
 * Resolves to null if it can't load (old browser, blocked script): the editor then falls back to LaTeX input.
 */
export function loadMathLive(): Promise<MathLiveModule | null> {
  // MathLive writes innerHTML itself, which pages enforcing Trusted Types block. There the
  // visual editor is skipped and equations are edited as LaTeX instead.
  if (trustedTypesEnforced()) return Promise.resolve(null);
  loading ??= import('mathlive')
    .then((mod) => {
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
