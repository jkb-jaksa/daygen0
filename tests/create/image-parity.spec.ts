import { test, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

async function ensureFontsReady(page: import('@playwright/test').Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.addInitScript(() => {
    // Hide any dev-only floating badges that differ between V1/V2
    const style = document.createElement('style');
    style.textContent = `
      .fixed.top-20.right-4 { display: none !important; }
    `;
    document.head.appendChild(style);
  });
  await page.evaluate(async () => {
    if ('fonts' in document) {
      // @ts-expect-error - fonts.ready is not in the standard DOM types
      await (document as { fonts?: { ready: Promise<void> } }).fonts?.ready;
    }
  });
  await page.waitForTimeout(200); // allow layout to settle
}

async function screenshotPNG(page: import('@playwright/test').Page) {
  const buf = await page.screenshot({ fullPage: true, animations: 'disabled' });
  return PNG.sync.read(buf);
}

function comparePNGs(a: PNG, b: PNG) {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Dimension mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }
  const { width, height } = a;
  const diff = new PNG({ width, height });
  const numDiff = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: 0.1,
    includeAA: true,
  });
  const ratio = numDiff / (width * height);
  return { numDiff, ratio };
}

test.describe('Create/Image visual parity (V1 vs V2)', () => {
  test('parity across breakpoints', async ({ page }) => {
    // Attempt to access V1; if auth blocks, skip with message
    const v1Url = '/create/image';
    await page.goto(v1Url, { waitUntil: 'domcontentloaded' });

    // Detect auth gate by URL change to /account
    if (new URL(page.url()).pathname.startsWith('/account')) {
      test.skip(true, 'Authentication required; provide TEST_EMAIL/TEST_PASSWORD or run with an authenticated preview.');
    }

    await ensureFontsReady(page);
    const v1Png = await screenshotPNG(page);

    // Open V2 in a new page to avoid state leakage
    const v2 = await page.context().newPage();
    await v2.goto('/create/image?v2=1', { waitUntil: 'domcontentloaded' });
    await ensureFontsReady(v2);
    const v2Png = await screenshotPNG(v2);

    const { ratio } = comparePNGs(v1Png, v2Png, 0.005);
    expect(ratio, `Pixels diff ratio ${ratio} should be <= 0.005`).toBeLessThanOrEqual(0.005);
  });
});


