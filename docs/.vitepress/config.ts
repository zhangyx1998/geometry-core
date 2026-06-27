import { defineConfig, type DefaultTheme } from 'vitepress';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import svg from './svg-loader';

const DOC = fileURLToPath(new URL('../', import.meta.url));
const SRC = fileURLToPath(new URL('../../src', import.meta.url));

type NavItem =
  | DefaultTheme.NavItemComponent
  | DefaultTheme.NavItemChildren
  | DefaultTheme.NavItemWithLink;

const guide_items: (DefaultTheme.SidebarItem & NavItem)[] = [
  { text: 'Conventions', link: '/conventions' },
];

const api_items: (DefaultTheme.SidebarItem & NavItem)[] = [
  { text: 'Overview', link: '/api/' },
  { text: 'Vectors and Boxes', link: '/api/vectors' },
  { text: 'Segments and Rays', link: '/api/segments' },
  { text: 'Contours and Polygons', link: '/api/polygons' },
  { text: 'Shapes', link: '/api/shapes' },
  { text: 'SVG I/O', link: '/api/svg-io' },
  { text: 'Utilities', link: '/api/utilities' },
];

const playground_items: (DefaultTheme.SidebarItem & NavItem)[] = [
  { text: 'Polygon Offset', link: '/playground/offset' },
  { text: 'Boolean Operations', link: '/playground/boolean' },
  { text: 'SVG I/O Operations', link: '/playground/svg-io' },
  { text: 'Inspector', link: '/playground/inspector' },
];

export default defineConfig({
  title: 'Geometry Core',
  description: 'A TypeScript library for computational geometry.',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', items: guide_items },
      { text: 'API Reference', items: api_items },
      { text: 'Playground', items: playground_items },
    ],
    sidebar: {
      '/conventions': { items: guide_items },
      '/api/': { items: api_items },
      '/playground/': { items: playground_items },
    },
  },
  vite: {
    esbuild: {
      target: 'es2022',
    },
    define: {
      __GEOMETRY_CORE_DEV__: JSON.stringify(
        process.env.NODE_ENV !== 'production',
      ),
    },
    resolve: {
      alias: [
        { find: /^geometry-core$/, replacement: resolve(SRC, 'index.ts') },
        { find: /^geometry-core\/(.*)$/, replacement: resolve(SRC, '$1') },
        { find: /^util\/(.*)$/, replacement: resolve(DOC, 'util/$1') },
      ],
    },
    plugins: [svg() as any],
  },
});
