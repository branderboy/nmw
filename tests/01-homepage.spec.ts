import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterAppErrors, ALL_PAGES } from './helpers';

test.describe('Homepage / sales funnel (index.html)', () => {
  test('homepage loads with hero, packages, and CTA', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/NMW Artist Funnel/i);

    // Urgency bar (CMS-controlled span)
    await expect(page.locator('[data-cms="urgencyBar"]')).toBeVisible();

    // Hero
    await expect(page.locator('[data-cms="heroEyebrow"]')).toBeVisible();
    await expect(page.locator('[data-cms="heroHeadline"]')).toBeVisible();
    await expect(page.locator('[data-cms="primaryCta"]')).toBeVisible();

    // Hero video thumbnail image is real
    const thumb = page.locator('img[src="images/video_thumbnail.png"]');
    await expect(thumb).toBeVisible();

    // 5 packages exist (Media Ready, One Mic Visual, Performance Ready, Full Experience, Premiere)
    await expect(page.getByRole('heading', { name: /Media Ready/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Performance Ready/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Premiere Package/i })).toBeVisible();

    // 5 "Select This Package" CTAs
    const selectButtons = page.getByRole('link', { name: /Select This Package/i });
    await expect(selectButtons).toHaveCount(5);

    // No app console errors
    const appErrors = filterAppErrors(errors());
    expect(appErrors, `unexpected console errors: ${appErrors.join('\n')}`).toEqual([]);
  });

  test('CTA scrolls to packages section', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('button', { name: /Yes! Start My Rollout Now/i }).first();
    await expect(cta).toBeVisible();
    await cta.click();
    // Packages section is visible after scroll
    await expect(page.locator('#packages')).toBeInViewport();
  });

  test('all funnel pages load with 200 status', async ({ page }) => {
    for (const path of ALL_PAGES) {
      const res = await page.goto(path);
      expect(res?.status(), `${path} should respond with 200`).toBe(200);
    }
  });

  test('404 path returns non-200', async ({ page }) => {
    const res = await page.goto('/does-not-exist.html');
    expect([404, 403]).toContain(res?.status());
  });

  test('no broken images on homepage', async ({ page }) => {
    await page.goto('/');
    const broken = await page.evaluate(() => {
      const imgs = Array.from(document.images);
      return imgs
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src);
    });
    expect(broken, `broken images: ${broken.join(', ')}`).toEqual([]);
  });
});
