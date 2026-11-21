import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://axiomtext.dev',
  integrations: [
    starlight({
      title: 'AxiomText',
      description: 'Free, open-source (MIT) rich text editor with a built-in visual math editor.',
      logo: { src: './src/assets/logo.svg' },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/axiomtext/axiomtext' }],
      editLink: { baseUrl: 'https://github.com/axiomtext/axiomtext/edit/main/apps/website/' },
      customCss: ['./src/styles/site.css'],
      sidebar: [
        {
          label: 'Start here',
          items: ['start/introduction', 'start/installation', 'start/quick-start', 'demo'],
        },
        {
          label: 'Guides',
          items: [
            'guides/editor-types',
            'guides/math',
            'guides/images',
            'guides/saving',
            'guides/website-rendering',
            'guides/languages',
            'guides/security',
          ],
        },
        { label: 'Frameworks', items: ['frameworks/react', 'frameworks/vue', 'frameworks/cdn'] },
        {
          label: 'Reference',
          items: [
            'reference/editor-api',
            'reference/options',
            'reference/plugins',
            'reference/shortcuts',
          ],
        },
      ],
    }),
  ],
  vite: { build: { assetsInlineLimit: 0 } },
});
