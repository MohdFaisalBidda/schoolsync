const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const RAW = path.join(__dirname, 'raw');
const SILENT = path.join(__dirname, 'schoolsync-demo-silent.mp4');
const AMBIENT = path.join(__dirname, 'ambient.wav');
const SPEECH = path.join(__dirname, 'elevenlabs-speech.mp3');
const OUTPUT = path.join(__dirname, 'schoolsync-demo.mp4');

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

(async () => {
  fs.rmSync(RAW, { recursive: true, force: true });
  fs.mkdirSync(RAW, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.startDemo());
  await page.waitForTimeout(97500);
  await context.close();
  await browser.close();

  const video = fs.readdirSync(RAW).find((file) => file.endsWith('.webm'));
  if (!video) throw new Error('No Playwright video was written');
  const source = path.join(RAW, video);

  run('ffmpeg', [
    '-y',
    '-ss',
    '1.2',
    '-i',
    source,
    '-t',
    '96',
    '-vf',
    'fps=30,format=yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-movflags',
    '+faststart',
    SILENT,
  ]);

  run('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=130.81:duration=96:sample_rate=44100',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=196.00:duration=96:sample_rate=44100',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=261.63:duration=96:sample_rate=44100',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=329.63:duration=96:sample_rate=44100',
    '-f',
    'lavfi',
    '-i',
    'anoisesrc=color=pink:duration=96:amplitude=0.004:sample_rate=44100',
    '-filter_complex',
    '[0:a]volume=0.10[a0];[1:a]volume=0.075[a1];[2:a]volume=0.055[a2];[3:a]volume=0.035[a3];[4:a]lowpass=f=700,volume=0.5[a4];[a0][a1][a2][a3][a4]amix=inputs=5:normalize=0,lowpass=f=1400,volume=4.0,alimiter=limit=0.95,afade=t=in:st=0:d=4,afade=t=out:st=92:d=4[a]',
    '-map',
    '[a]',
    '-c:a',
    'pcm_s16le',
    AMBIENT,
  ]);

  run('ffmpeg', [
    '-y',
    '-i',
    SILENT,
    '-i',
    SPEECH,
    '-filter_complex',
    '[0:v]setpts=PTS/1.6,fps=30,format=yuv420p[v];[1:a]atrim=start=0:end=96,atempo=1.6[a]',
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-ac',
    '2',
    '-t',
    '60',
    '-movflags',
    '+faststart',
    OUTPUT,
  ]);

  run('ffmpeg', [
    '-y',
    '-ss',
    '2',
    '-i',
    OUTPUT,
    '-frames:v',
    '1',
    '-vf',
    'scale=1280:720',
    '-q:v',
    '2',
    path.join(__dirname, 'thumbnail.jpg'),
  ]);

  console.log(OUTPUT);
})();
