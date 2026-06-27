import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __GEOMETRY_CORE_DEV__: 'true',
  },
  test: {
    setupFiles: ['./test.setup.ts'],
  },
});
