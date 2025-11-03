import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./tests/e2e/T067_admin_courses_create.spec.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: './tests/dist',
  external: ['@playwright/test'],
  format: 'esm',
  sourcemap: true,
  alias: {
    '@': './src',
    '@components': './src/components',
    '@layouts': './src/layouts',
    '@lib': './src/lib',
    '@api': './src/api',
    '@middleware': './src/middleware',
    '@styles': './src/styles'
  },
});