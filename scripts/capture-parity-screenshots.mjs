import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function ensureFontsReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = `.fixed.top-20.right-4 { display: none !important; }`;
    document.head.appendChild(style);
  });
  await page.evaluate(async () => {
    if ('fonts' in document) {
      // @ts-ignore
      await document.fonts.ready;
    }
  });
  await page.waitForTimeout(200);
}

async function capture() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  const outDirUrl = new URL('../docs/parity/', import.meta.url);
  const outDirPath = fileURLToPath(outDirUrl);
  fs.mkdirSync(outDirPath, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  // V1
  await page.goto(`${baseUrl}/create/image`, { waitUntil: 'domcontentloaded' });
  // If auth redirects, bail with message so caller can handle
  const url1 = new URL(page.url());
  if (url1.pathname.startsWith('/signup')) {
    console.error('Auth required. Log in to the app and re-run.');
    await browser.close();
    process.exit(2);
  }
  await ensureFontsReady(page);
  const v1Path = path.join(outDirPath, 'create-image-v1-1440.png');
  await page.screenshot({ path: v1Path, fullPage: true, animations: 'disabled' });

  // V2
  const page2 = await context.newPage();
  await page2.goto(`${baseUrl}/create/image?v2=1`, { waitUntil: 'domcontentloaded' });
  await ensureFontsReady(page2);
  const v2Path = path.join(outDirPath, 'create-image-v2-1440.png');
  await page2.screenshot({ path: v2Path, fullPage: true, animations: 'disabled' });

  console.log('Saved:', v1Path);
  console.log('Saved:', v2Path);

  await browser.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});

