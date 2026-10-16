import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';

// Fresh SQLite and a random admin secret per run; never use the real game database.
const dataDir=process.env.VG_E2E_DATA_DIR ||= mkdtempSync('/tmp/vg-e2e-');
const password=process.env.VG_E2E_PASSWORD ||= randomBytes(24).toString('base64url');

export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.spec.ts',
  fullyParallel:false,
  workers:1,
  timeout:30_000,
  reporter:'list',
  use:{
    baseURL:'http://127.0.0.1:5183',
    viewport:{width:1440,height:950},
    launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']},
    screenshot:'only-on-failure',
    trace:'retain-on-failure',
  },
  webServer:{command:'npm run dev -- --port 5183 --strictPort',url:'http://127.0.0.1:5183/api/health',reuseExistingServer:false,timeout:15_000,env:{VG_DATA_DIR:dataDir,VG_ADMIN_USERNAME:'admin-e2e',VG_ADMIN_PASSWORD:password}},
});
