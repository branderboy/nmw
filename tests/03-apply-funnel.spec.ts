import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterAppErrors, resetAppState } from './helpers';

test.describe('Artist Access apply funnel (apply.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/apply.html');
    await resetAppState(page);
    await page.reload();
  });

  test('package preselected from query string is selected', async ({ page }) => {
    await page.goto('/apply.html?pkg=performance-ready');
    // Continue button should be enabled with preselected package
    const continueBtn = page.locator('[data-step="1"] button[data-next="1"]');
    await expect(continueBtn).toBeEnabled();
  });

  test('end-to-end performance tier checkout flow', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/apply.html');

    // STEP 1: Pick performance-ready package
    await page.locator('[data-pkg="performance-ready"]').click();
    await page.locator('[data-step="1"] button[data-next="1"]').click();

    // STEP "date": Pick the first available Wednesday
    await expect(page.locator('[data-step="date"]')).toBeVisible();
    const firstAvailableDate = page.locator('[data-step="date"] [data-date]:not([disabled])').first();
    await expect(firstAvailableDate).toBeVisible();
    await firstAvailableDate.click();
    await page.locator('button[data-next="date"]').click();

    // STEP 2: Goals — pick 2 chips
    await expect(page.locator('[data-step="2"]')).toBeVisible();
    await page.getByRole('button', { name: 'Build awareness' }).click();
    await page.getByRole('button', { name: 'Push a new release' }).click();
    await page.locator('button[data-next="2"]').click();

    // STEP 3: Recommendations (skipping picks ok)
    await expect(page.locator('[data-step="3"]')).toBeVisible();
    await page.locator('button[data-next="3"]').click();

    // STEP 4: Info form — fill required fields
    await expect(page.locator('[data-step="4"]')).toBeVisible();
    await page.locator('input[name="name"]').fill('Test Artist');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="artistName"]').fill('Stage Name');
    await page.locator('select[name="genre"]').selectOption('R&B');
    await page.locator('input[name="instagram"]').fill('@stagename');
    await page.locator('button[data-next="4"]').click();

    // STEP 5: Payment — order summary visible, click Complete Booking
    await expect(page.locator('[data-step="5"]')).toBeVisible();
    await expect(page.locator('#totalAmount')).toContainText('$');
    await page.locator('#payBtn').click();

    // STEP 6: Success — performance verification panel shown
    await expect(page.locator('[data-step="6"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /You're booked/i })).toBeVisible();
    await expect(page.locator('#performanceNext')).toBeVisible();
    await expect(page.locator('#welcomeName')).toContainText('Stage Name');
    await expect(page.locator('#welcomePkg')).toContainText('Performance Ready');

    // Direct sign-up links to all 3 platforms
    await expect(page.getByRole('link', { name: /Sign up/i }).filter({ has: page.locator('[href*="bandsintown.com"]') })).toHaveCount(0); // matches by href below

    const signupLinks = page.locator('#performanceNext a[target="_blank"]');
    const hrefs = await signupLinks.evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).href),
    );
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

  test('entry-tier checkout skips date step and verification panel', async ({ page }) => {
    await page.goto('/apply.html');
    await page.locator('[data-pkg="media-ready"]').click();
    await page.locator('[data-step="1"] button[data-next="1"]').click();

    // Should skip date and go straight to goals
    await expect(page.locator('[data-step="date"]')).toBeHidden();
    await expect(page.locator('[data-step="2"]')).toBeVisible();
    await page.getByRole('button', { name: 'Build awareness' }).click();
    await page.locator('button[data-next="2"]').click();

    await page.locator('button[data-next="3"]').click();

    await page.locator('input[name="name"]').fill('Entry Artist');
    await page.locator('input[name="email"]').fill('e@e.co');
    await page.locator('input[name="artistName"]').fill('EntryName');
    await page.locator('select[name="genre"]').selectOption('Soul');
    await page.locator('button[data-next="4"]').click();

    await page.locator('#payBtn').click();

    await expect(page.locator('#performanceNext')).toBeHidden();
    await expect(page.getByRole('heading', { name: /You're booked/i })).toBeVisible();
  });

  test('info form validation: cannot submit with missing required fields', async ({ page }) => {
    await page.goto('/apply.html');
    await page.locator('[data-pkg="media-ready"]').click();
    await page.locator('[data-step="1"] button[data-next="1"]').click();
    await page.getByRole('button', { name: 'Build awareness' }).click();
    await page.locator('button[data-next="2"]').click();
    await page.locator('button[data-next="3"]').click();

    // Click continue without filling fields → validateInfo returns false, focuses first invalid input
    const beforeStep = await page.locator('[data-step="4"]').isVisible();
    expect(beforeStep).toBe(true);
    await page.locator('button[data-next="4"]').click();
    // Should still be on step 4
    await expect(page.locator('[data-step="4"]')).toBeVisible();
    await expect(page.locator('[data-step="5"]')).toBeHidden();
  });

  test('cannot continue from step 1 without selecting a package', async ({ page }) => {
    await page.goto('/apply.html');
    await expect(page.locator('[data-step="1"] button[data-next="1"]')).toBeDisabled();
  });
});
