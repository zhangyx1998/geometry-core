/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import terser from '@rollup/plugin-terser';
import { readFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { defineConfig, type Plugin } from 'rollup';
import { dts as dtsPlugin } from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import { fileURLToPath } from 'url';
// import transformREADME from "./scripts/transformREADME.ts";
// import { handleAuthToken } from "./scripts/handleAuthToken.ts";

const ROOT = resolve(fileURLToPath(import.meta.url), '..');
const $ = (...p: string[]) => resolve(ROOT, ...p);

function pick(input: Record<string, any>, ...keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, input[k]]));
}

function read(file: string) {
  return readFileSync($(file), 'utf-8');
}

const pkg = JSON.parse(read('package.json'));
const distKeys = [
  'name',
  'version',
  'description',
  'main',
  'module',
  'types',
  'exports',
  'engines',
  'license',
  'author',
  'repository',
  'homepage',
  'bugs',
  'keywords',
  'dependencies',
  'publishConfig',
];

function packageMeta(isProduction: boolean, exports = {}): Plugin {
  // In debug build, strip other fields to prevent accidental publish
  const [mjs, cjs, dts] = ['index.mjs', 'index.cjs', 'index.d.ts'];
  const packageJSON = isProduction
    ? pick(
        {
          ...pkg,
          main: `./${cjs}`,
          module: `./${mjs}`,
          types: `./${dts}`,
          exports,
          publishConfig: { access: 'public' },
        },
        ...distKeys,
      )
    : { exports };
  return {
    name: 'package-meta',
    buildStart() {
      this.emitFile({
        type: 'asset',
        fileName: 'package.json',
        source: JSON.stringify(packageJSON, null, 2),
      });
      if (!isProduction) return;
      this.emitFile({
        type: 'asset',
        fileName: 'LICENSE',
        source: read('LICENSE'),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'README.md',
        source: read('README.md'),
      });
      //   handleAuthToken.call(this);
    },
  };
}

export default defineConfig((commandLineArgs) => {
  const dst = 'dist';
  rmSync(dst, { recursive: true, force: true });
  const isProduction = commandLineArgs.configDebug !== true;
  const sourcemap = isProduction ? false : 'inline';
  const index = isProduction ? 'index' : 'index.debug';
  const [mjs, cjs, dts] = [`${index}.mjs`, `${index}.cjs`, `${index}.d.ts`];
  const exports = {
    '.': {
      import: `./${mjs}`,
      require: `./${cjs}`,
      types: `./${dts}`,
    },
  };
  const plugins = [
    esbuild({
      target: 'node20',
      define: {
        __GEOMETRY_CORE_DEV__: String(!isProduction),
      },
    }),
  ];
  if (isProduction) {
    plugins.push(terser());
  }
  return [
    // ESM Build
    {
      input: $('src', `index.ts`),
      output: {
        format: 'esm',
        file: $(dst, mjs),
        sourcemap,
        exports: 'named',
      },
      external: ['node:vm'],
      plugins,
    },
    // CJS Build
    {
      input: $('src', `index.ts`),
      output: {
        format: 'cjs',
        file: $(dst, cjs),
        sourcemap,
        exports: 'named',
      },
      external: ['node:vm'],
      plugins,
    },
    // d.ts Build
    {
      input: $('src', `index.ts`),
      output: {
        format: 'esm',
        file: $(dst, dts),
      },
      plugins: [
        dtsPlugin({ respectExternal: true }),
        packageMeta(isProduction, exports),
      ],
    },
  ];
});
