const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3100';
const OUT = path.join(__dirname, 'assets');
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const PASSWORD = env.match(/^DEMO_PASSWORD=(.*)$/m)?.[1]?.replace(/^"|"$/g, '');

const SHOTS = [
  { email: 'admin@schoolsync.local', url: '/dashboard', file: 'dashboard-admin.png' },
  { email: 'admin@schoolsync.local', url: '/collaboration', file: 'collaboration-admin.png' },
  { email: 'admin@schoolsync.local', url: '/approvals', file: 'approvals-admin.png' },
  { email: 'teacher@schoolsync.local', url: '/teaching/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', file: 'teaching-pending.png' },
  { email: 'student@schoolsync.local', url: '/teaching/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', file: 'teaching-approved-student.png' },
  { email: 'principal@schoolsync.local', url: '/notices/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', file: 'notices-pending.png' },
  { email: 'parent@schoolsync.local', url: '/notices/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', file: 'notices-approved-parent.png' },
  { email: 'coordinator@schoolsync.local', url: '/activities/cccccccc-cccc-4ccc-8ccc-ccccccccccc2', file: 'activities-pending.png' },
  { email: 'student@schoolsync.local', url: '/activities/cccccccc-cccc-4ccc-8ccc-ccccccccccc1', file: 'activities-approved-student.png' },
];

async function login(context, email) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  return page;
}

(async () => {
  if (!PASSWORD) throw new Error('DEMO_PASSWORD missing from .env.local');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const sessions = new Map();

  for (const shot of SHOTS) {
    let page = sessions.get(shot.email);
    if (!page) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      page = await login(context, shot.email);
      sessions.set(shot.email, page);
    }
    await page.goto(`${BASE}${shot.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, shot.file) });
    console.log(shot.file);
  }

  await browser.close();
})();
