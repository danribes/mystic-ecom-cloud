import { test, type PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: PlaywrightTestConfig = {
  globalSetup: './global-setup.ts',
  testMatch: '*.spec.ts',
  timeout: 60000,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4321',
    trace: 'on-first-retry',
    video: 'on-first-retry'
  },
  reporter: [['html', { outputFolder: path.join(__dirname, 'test-results') }]],
}

export default config;