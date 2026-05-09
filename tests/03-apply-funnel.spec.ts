import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterAppErrors, resetAppState } from './helpers';

// Helper: fill the step-1 details form
async function fillStep1Details(page: any, opts: { artistName?: string } = {}) {
  await page.locator('input[name="name"]').fill('Test Artist');
  await page.locator('input[name="email"]').fill('test@example.com');
  await page.locator('input[name="artistName"]').fill(opts.artistName ?? 'Stage Name');
  await page.locator('select[name="genre"]').selectOption('R&B');
}

test.describe('Artist Access apply funnel (apply.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/apply.html');
    await resetAppState(page);
    await page.reload();
  });

  test('package preselected from query string + filled details enables continue', async ({ page }) => {
    await page.goto('/apply.html?pkg=performance-ready');
    await fillStep1Details(page);
    const continueBtn = page.locator('[data-step="1"] button[data-next="1"]');
    await expect(continueBtn).toBeEnabled();
  });

  test('end-to-end performance tier checkout flow', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/apply.html');

    // STEP 1: pick package + fill required details (now combined)
    await page.locator('[data-pkg="performance-ready"]').click();
    await fillStep1Details(page);
    await page.locator('[data-step="1"] button[data-next="1"]').click();

    // STEP date: pick the first available Wednesday (performance tier only)
    await expect(page.locator('[data-step="date"]')).toBeVisible();
    const firstAvailableDate = page.locator('[data-step="date"] [data-date]:not([disabled])').first();
    await firstAvailableDate.click();
    await page.locator('button[data-next="date"]').click();

    // STEP enhance: pick a goal (recommendations populate)
    await expect(page.locator('[data-step="enhance"]')).toBeVisible();
    await page.getByRole('button', { name: 'Push a new release' }).click();
    await page.locator('button[data-next="enhance"]').click();

    // STEP payment: order summary in right rail, click Complete Booking
    await expect(page.locator('[data-step="payment"]')).toBeVisible();
    await expect(page.locator('#summaryTotal')).toContainText('$');
    await page.locator('button[data-next="payment"]').click();

    // STEP success
    await expect(page.locator('[data-step="success"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /You're booked/i })).toBeVisible();
    await expect(page.locator('#performanceNext')).toBeVisible();
    await expect(page.locator('#welcomeName')).toContainText('Stage Name');

    const signupLinks = page.locator('#performanceNext a[target="_blank"]');
    const hrefs = await signupLinks.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    expect(hrefs.some((h) => /artists\.bandsintown\.com/.test(h))).toBe(true);
    expect(hrefs.some((h) => /songkick\.com/.test(h))).toBe(true);
    expect(hrefs.some((h) => /dice\.fm/.test(h))).toBe(true);

    // Artist record was created in localStorage
    const artist = await page.evaluate(() => {
      const raw = localStorage.getItem('nmw.artist');
      return raw ? JSON.parse(raw) : null;
    });
    expect(artist).not.toBeNull();
    expect(artist.artistName).toBe('Stage Name');
    expect(artist.performanceSlot).toBe(true);
    expect(artist.event).not.toBeNull();
    expect(artist.event.title).toContain('Stage Name');

    expect(filterAppErrors(errors())).toEqual([]);
  });

  test('entry-tier checkout skips the date step', async ({ page }) => {
    await page.goto('/apply.html');
    await page.locator('[data-pkg="media-ready"]').click();
    await fillStep1Details(page, { artistName: 'EntryName' });
    await page.locator('[data-step="1"] button[data-next="1"]').click();

    // Should NOT show the date step for entry tier
    await expect(page.locator('[data-step="date"]')).toBeHidden();
    await expect(page.locator('[data-step="enhance"]')).toBeVisible();

    await page.locator('button[data-next="enhance"]').click();
    await expect(page.locator('[data-step="payment"]')).toBeVisible();
    await page.locator('button[data-next="payment"]').click();

    await expect(page.locator('[data-step="success"]')).toBeVisible();
    await expect(page.locator('#performanceNext')).toBeHidden();
  });

  test('cannot continue from step 1 without package + required details', async ({ page }) => {
    await page.goto('/apply.html');
    const cont = page.locator('[data-step="1"] button[data-next="1"]');
    // No package, no details
    await expect(cont).toBeDisabled();
    // Package only — still missing details
    await page.locator('[data-pkg="media-ready"]').click();
    await expect(cont).toBeDisabled();
    // Now fill details — should enable
    await fillStep1Details(page);
    await expect(cont).toBeEnabled();
  });
});
