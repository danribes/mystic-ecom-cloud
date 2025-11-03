import { register } from 'tsconfig-paths';

// Register path aliases from tsconfig.json for Playwright tests
register({
  baseUrl: '.',
  paths: {
    '@/*': ['src/*'],
    '@components/*': ['src/components/*'],
    '@layouts/*': ['src/layouts/*'],
    '@lib/*': ['src/lib/*'],
    '@api/*': ['src/api/*'],
    '@middleware/*': ['src/middleware/*'],
    '@styles/*': ['src/styles/*']
  }
});