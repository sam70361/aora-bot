import { THEME_MANIFEST } from '@aora-bot/engine';
import { defineConfig, type RspressPlugin } from '@rspress/core';
import { pluginPreview } from '@rspress/plugin-preview';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BROWSERSLIST } from '../scripts/build-shared.ts';
import { navFor, sidebarFor } from './navigation.js';

const here = dirname(fileURLToPath(import.meta.url));

type Message = Record<'en' | 'zh', string>;
const messages: Record<string, Message> = JSON.parse(readFileSync(resolve(here, 'i18n.json'), 'utf8'));
const message = (key: string, lang: 'en' | 'zh', name: string) =>
  messages[key]![lang].replace('{{name}}', name);

/*
 * One album page per theme in the engine's manifest, in both languages, so a
 * theme the engine ships has its page at `/themes/<id>` without a file being
 * added here. Each page is the album component and the theme's names.
 */
const themeAlbums = (): RspressPlugin => ({
  name: 'theme-albums',
  addPages: () =>
    THEME_MANIFEST.flatMap((theme) =>
      (['zh', 'en'] as const).map((lang) => ({
        routePath: `${lang === 'zh' ? '' : '/en'}/themes/${theme.id}`,
        content: [
          '---',
          'pageType: custom',
          `title: ${JSON.stringify(message('themes.album.title', lang, theme.name[lang]))}`,
          `description: ${JSON.stringify(message('themes.album.description', lang, theme.name[lang]))}`,
          '---',
          '',
          `import { ThemeAlbum } from '@app/themes';`,
          '',
          `<ThemeAlbum id=${JSON.stringify(theme.id)} />`,
          '',
        ].join('\n'),
      })),
    ),
});

export default defineConfig({
  root: 'content',
  outDir: 'doc_build',
  title: 'Aora Bot',
  description: 'A procedural character engine for the web',
  icon: '/favicon.svg',
  logo: '/logo.svg',
  logoText: 'Aora Bot',

  /*
   * Chinese is the default locale, so its routes have no language prefix:
   * `/guide/getting-started`. English lives under `/en/`.
   *
   * Page links are written without a locale prefix. `markdown.link.autoPrefix`
   * adds `/en/` on English pages and leaves Chinese links unprefixed.
   */
  lang: 'zh',
  // Links match the extensionless paths Vercel serves under `cleanUrls`, so no page link goes through a redirect.
  route: { cleanUrls: true },
  locales: [
    {
      lang: 'zh',
      label: '简体中文',
      title: 'Aora Bot',
      description: '一套程序化生成的网页角色引擎',
    },
    {
      lang: 'en',
      label: 'English',
      title: 'Aora Bot',
      description: 'A procedural character engine for the web',
    },
  ],

  languageParity: {
    enabled: true,
    include: [],
    exclude: [],
  },

  head: [
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Aora Bot' }],
    ['meta', { property: 'og:image', content: '/og.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'theme-color', content: '#1084fe' }],
    // Vercel serves this script itself, so it only exists on Vercel deployments.
    ...(process.env.VERCEL ? ['<script defer src="/_vercel/insights/script.js"></script>'] : []),
  ],

  themeConfig: {
    /*
     * Nav and sidebar come from `navigation.ts` instead of `_nav.json` and
     * `_meta.json`, so that every section of the site is listed in one
     * sidebar rather than one section at a time. Declaring them here turns
     * the automatic generation off, which is why both are declared.
     */
    locales: [
      { lang: 'zh', label: '简体中文', nav: navFor('zh'), sidebar: sidebarFor('zh') },
      { lang: 'en', label: 'English', nav: navFor('en'), sidebar: sidebarFor('en') },
    ],
    socialLinks: [{ icon: 'github', mode: 'link', content: 'https://github.com/sam70361/aora-bot' }],
    // A first visit opens dark, where the characters' colours carry best; the switch stays, and a choice is remembered.
    darkMode: 'dark',
    enableContentAnimation: false,
    enableScrollToTop: true,
    editLink: {
      docRepoBaseUrl: 'https://github.com/sam70361/aora-bot/tree/main/docs/content',
    },
    lastUpdated: true,
  },

  markdown: {
    link: {
      checkDeadLinks: true,
      checkAnchors: true,
      autoPrefix: true,
    },
  },

  plugins: [
    pluginPreview({
      defaultRenderMode: 'pure',
      defaultPreviewMode: 'internal',
    }),
    themeAlbums(),
  ],

  builderConfig: {
    output: {
      // Shipped as written, so Rspress's `.rp-dark` toggle reaches the kit's tokens through `color-scheme`.
      overrideBrowserslist: BROWSERSLIST,
    },
    resolve: {
      alias: {
        '@app': resolve(here, 'app'),
        '@aora-bot/react/styles.css': resolve(here, '../packages/react/src/styles/index.css'),
        '@aora-bot/react$': resolve(here, '../packages/react/src/index.ts'),
        '@aora-bot/react/static$': resolve(here, '../packages/react/src/static.ts'),
        '@aora-bot/surfaces/styles.css': resolve(here, '../packages/surfaces/src/styles/index.css'),
        '@aora-bot/surfaces$': resolve(here, '../packages/surfaces/src/index.ts'),
        '@aora-bot/surfaces/static$': resolve(here, '../packages/surfaces/src/static.ts'),
        '@aora-bot/engine$': resolve(here, '../packages/engine/src/index.ts'),
        '@aora-bot/engine/static$': resolve(here, '../packages/engine/src/static.ts'),
      },
    },
    tools: {
      rspack: {
        // One build of each module for the page and its workers, so a worker reuses the page's chunks from the cache.
        optimization: { usedExports: 'global' },
      },
    },
  },
});
