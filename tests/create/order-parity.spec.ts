import { test, expect } from '@playwright/test';

async function openModelMenu(page: import('@playwright/test').Page) {
  // The model selector button contains a ModelBadge and current model name, followed by a chevron
  await page.getByRole('button').filter({ hasText: 'Gemini 2.5 Flash' }).first().click();
}

async function readModelNames(page: import('@playwright/test').Page) {
  // Model list items render model name as the first line of text inside the button
  const items = page.locator('[role="button"]').locator('div:scope >> nth=1');
  const count = await items.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const name = (await items.nth(i).textContent())?.trim() || '';
    if (name) names.push(name);
  }
  // Filter out obvious non-model items
  return names.filter(n => n.length > 0 && n !== 'Choose AI Model');
}

async function readPromptButtonOrder(page: import('@playwright/test').Page) {
  // Third row small icon buttons: Settings, Aspect Ratio (has Scan icon), Batch size group, Prompts (Bookmark)
  // Use aria-labels and roles to extract a stable sequence
  const order: string[] = [];
  const container = page.locator('.promptbar');
  const buttons = container.locator('button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const b = buttons.nth(i);
    const label = (await b.getAttribute('aria-label')) || '';
    if (['Settings', 'Aspect ratio'].includes(label)) order.push(label);
    if (label.startsWith('Decrease batch size') || label.startsWith('Increase batch size')) {
      if (!order.includes('Batch size')) order.push('Batch size');
    }
    // Prompts button has a tooltip "Your Prompts" and no explicit aria-label; match by Bookmark icon role/size would be flaky
  }
  // Add Prompts at the end if the bookmark button exists
  const hasPrompts = await container.getByText('Your Prompts').first().isVisible().catch(() => false);
  if (hasPrompts) order.push('Your Prompts');
  return order;
}

test.describe('Model selector and prompt controls order parity (V1 vs V2)', () => {
  test('model list and control buttons order match', async ({ page, context }) => {
    // V1
    await page.goto('/create/image', { waitUntil: 'domcontentloaded' });
    if (new URL(page.url()).pathname.startsWith('/account')) {
      test.skip(true, 'Authentication required. Log in first.');
    }
    await openModelMenu(page);
    const v1Models = await readModelNames(page);
    const v1PromptOrder = await readPromptButtonOrder(page);

    // V2
    const v2 = await context.newPage();
    await v2.goto('/create/image?v2=1', { waitUntil: 'domcontentloaded' });
    await openModelMenu(v2);
    const v2Models = await readModelNames(v2);
    const v2PromptOrder = await readPromptButtonOrder(v2);

    expect(v2Models).toEqual(v1Models);
    expect(v2PromptOrder).toEqual(v1PromptOrder);
  });
});






