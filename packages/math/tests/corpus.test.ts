/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import katex from 'katex';
import { loadKatex, mathmlStringToLatex, renderLatex } from '../src';

interface Entry {
  id: string;
  area: string;
  latex: string;
}
const corpus = JSON.parse(
  readFileSync(resolve(process.cwd(), '../../corpora/equations/m1-500.json'), 'utf8'),
) as Entry[];

beforeAll(async () => {
  await loadKatex();
});

describe('500-equation corpus (M1 notation coverage)', () => {
  it('has 500 unique equations across every M1 area', () => {
    expect(corpus).toHaveLength(500);
    expect(new Set(corpus.map((e) => e.latex)).size).toBe(500);
    const areas = new Set(corpus.map((e) => e.area));
    for (const area of [
      'algebra',
      'calculus',
      'matrices',
      'cases',
      'aligned',
      'vectors',
      'sets-logic',
      'statistics',
      'trigonometry',
      'accents',
    ])
      expect(areas).toContain(area);
  });

  it('renders every equation without errors', () => {
    const failures = corpus
      .filter((e) => renderLatex(e.latex, true).error !== null)
      .map((e) => `${e.id}: ${e.latex}`);
    expect(failures).toEqual([]);
  });

  it('converts MathML back to LaTeX that renders (paste from other sites)', () => {
    const failures: string[] = [];
    for (const e of corpus) {
      const mathml = katex
        .renderToString(e.latex, { output: 'mathml', displayMode: true, throwOnError: false })
        // Remove the TeX annotation so the real MathML converter is exercised.
        .replace(/<annotation encoding="application\/x-tex">[\s\S]*?<\/annotation>/, '');
      const latex = mathmlStringToLatex(mathml);
      if (!latex || renderLatex(latex, true).error) failures.push(`${e.id}: ${latex ?? '(none)'}`);
    }
    // Lossy cases are allowed but must stay rare.
    expect(failures.length, failures.slice(0, 10).join('\n')).toBeLessThanOrEqual(5);
  });
});
