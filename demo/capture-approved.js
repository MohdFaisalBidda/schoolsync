const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { PrismaClient } = require('@prisma/client');

const BASE = 'http://localhost:3100';
const OUT = path.join(__dirname, 'assets');
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const PASSWORD = env.match(/^DEMO_PASSWORD=(.*)$/m)?.[1]?.replace(/^"|"$/g, '');
process.env.DATABASE_URL = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.replace(/^"|"$/g, '');

const RECORDS = {
  material: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  notice: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  activity: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
};

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

async function shot(browser, email, url, file) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await login(context, email);
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, file) });
  await context.close();
  console.log(file);
}

(async () => {
  if (!PASSWORD) throw new Error('DEMO_PASSWORD missing from .env.local');
  const prisma = new PrismaClient();
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  });

  try {
    await prisma.teachingMaterial.update({ where: { id: RECORDS.material }, data: { status: 'APPROVED' } });
    await prisma.notice.update({ where: { id: RECORDS.notice }, data: { status: 'APPROVED' } });
    await prisma.activity.update({ where: { id: RECORDS.activity }, data: { status: 'APPROVED' } });

    await shot(browser, 'student@schoolsync.local', `/teaching/${RECORDS.material}`, 'teaching-approved-same.png');
    await shot(browser, 'parent@schoolsync.local', `/notices/${RECORDS.notice}`, 'notices-approved-same.png');
    await shot(browser, 'student@schoolsync.local', `/activities/${RECORDS.activity}`, 'activities-approved-same.png');
  } finally {
    await prisma.teachingMaterial.update({ where: { id: RECORDS.material }, data: { status: 'PENDING_APPROVAL' } });
    await prisma.notice.update({ where: { id: RECORDS.notice }, data: { status: 'PENDING_APPROVAL' } });
    await prisma.activity.update({ where: { id: RECORDS.activity }, data: { status: 'PENDING_APPROVAL' } });
    await prisma.$disconnect();
    await browser.close();
  }
})();
