import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/vite.config.{mjs,js,ts,mts}', '**/vitest.config.{mjs,js,ts,mts}'],
  },
});
