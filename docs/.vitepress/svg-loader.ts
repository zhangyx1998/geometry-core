import type { Plugin } from 'vite';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'node-html-parser';
import { compileStyle } from '@vue/compiler-sfc';

function scopeId(id: string): string {
  return createHash('md5').update(id).digest('hex').slice(0, 8);
}

export default function svg(): Plugin {
  return {
    name: 'svg-loader',
    enforce: 'pre',
    load(id: string) {
      if (!id.endsWith('.svg')) return;
      const raw = fs.readFileSync(id, 'utf-8');
      const doc = parse(raw);
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return;

      const scope = scopeId(id);
      const scopeAttr = `data-v-${scope}`;
      // Add scope attribute to the all elements in the SVG
      svgEl.setAttribute(scopeAttr, '');
      svgEl.querySelectorAll('*').forEach((el) => {
        el.setAttribute(scopeAttr, '');
      });

      let html = svgEl.innerHTML;
      html = html.replace(
        /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
        (_, open, css, close) => {
          const result = compileStyle({
            source: css,
            id: scopeAttr,
            scoped: true,
            filename: id,
          });
          return `${open}${result.code}${close}`;
        },
      );

      const ownAttrs = JSON.stringify(svgEl.attributes);
      const innerHTML = JSON.stringify(html);

      return `
        import { defineComponent, h } from "vue";
        export const ownAttrs = ${ownAttrs};
        export const innerHTML = ${innerHTML};
        export default defineComponent({
          props: {
            tagName: {
              type: String,
              default: "svg",
            },
          },
          setup(props, { attrs }) {
            return () => h(props.tagName, { ...ownAttrs, ...attrs, innerHTML });
          }
        });`;
    },
  };
}
