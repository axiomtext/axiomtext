import type { DocumentJSON } from '@axiomtext/core';

export const chapter: DocumentJSON = {
  version: 1,
  doc: {
    type: 'doc',
    content: [
      { type: 'page', attrs: { number: 23 } },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Photosynthesis & <light>' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Plants make food by ' },
          {
            type: 'text',
            text: 'photosynthesis',
            marks: [
              { type: 'bold' },
              {
                type: 'marker',
                attrs: { type: 'important', id: 'm1', data: { questionIds: ['q1'] }, badge: '1' },
              },
            ],
          },
          { type: 'text', text: ': ' },
          { type: 'math_inline', attrs: { latex: 'E = mc^2' } },
          {
            type: 'text',
            text: ' read more',
            marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
          },
        ],
      },
    ],
  },
};
