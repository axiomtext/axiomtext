import type { DocumentJSON } from 'axiomtext';
import { sampleDocument } from './sample-full';

const math: DocumentJSON = {
  version: 1,
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Click any part of an equation to edit it: ' },
          { type: 'math_inline', attrs: { latex: 'e^{i\\pi} + 1 = 0' } },
          { type: 'text', text: '. Type ' },
          { type: 'text', text: '$x^2$', marks: [{ type: 'code' }] },
          { type: 'text', text: ' to make a new one.' },
        ],
      },
      { type: 'math_block', attrs: { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' } },
    ],
  },
};

export const samples: Record<'full' | 'math' | 'empty', DocumentJSON | undefined> = {
  full: sampleDocument,
  math,
  empty: undefined,
};
