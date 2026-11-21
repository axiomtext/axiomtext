import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://axiomtext.dev',
  integrations: [
    starlight({
      title: 'AxiomText',
      description: 'Free, open-source (MIT) rich text editor with a built-in visual math editor.',
      logo: { src: './src/assets/logo.svg' },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/axiomtext/axiomtext' },
        { icon: 'patreon', label: 'Support on Patreon', href: 'https://www.patreon.com/axiomtext' },
        { icon: 'email', label: 'Contact', href: '/contact/' },
      ],
      editLink: { baseUrl: 'https://github.com/axiomtext/axiomtext/edit/main/apps/website/' },
      customCss: [
        '@fontsource-variable/bricolage-grotesque',
        '@fontsource/ibm-plex-sans/400.css',
        '@fontsource/ibm-plex-sans/500.css',
        '@fontsource/ibm-plex-sans/600.css',
        '@fontsource/ibm-plex-mono/400.css',
        './src/styles/site.css',
      ],
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
            'guides/comments',
            'guides/marked-books',
            'guides/pdf-annotation',
            'guides/saving',
            'guides/website-rendering',
            'guides/server-rendering',
            'guides/languages',
            'guides/security',
          ],
        },
        {
          label: 'Frameworks',
          items: ['frameworks/react', 'frameworks/vue', 'frameworks/flutter', 'frameworks/cdn'],
        },
        {
          label: 'Reference',
          items: [
            'reference/editor-api',
            'reference/options',
            'reference/plugins',
            'reference/shortcuts',
          ],
        },
        { label: 'Project', items: ['contact'] },
      ],
    }),
  ],
  vite: { build: { assetsInlineLimit: 0 } },
});
