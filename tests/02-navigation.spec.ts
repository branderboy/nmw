import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterAppErrors } from './helpers';

const TOP_NAV_LINKS: { name: RegExp; expectedPath: RegExp }[] = [
  { name: /^MISSION$/, expectedPath: /mission\.html/ },
  { name: /^EVENTS$/, expectedPath: /events\.html/ },
  { name: /^DJ CALL$/, expectedPath: /dj-call\.html/ },
  { name: /ARTIST ACCESS/, expectedPath: /apply\.html/ },
  { name: /^FAQ$/, expectedPath: /faq\.html/ },
  { name: /GET ALERTS/, expectedPath: /alerts\.html/ },
  // Sponsor link label varies (SPONSOR vs SPONSOR NMW); test by URL match
];

test.describe('Top navigation across funnel pages', () => {
  test('homepage nav links navigate to correct pages', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');

    for (const link of TOP_NAV_LINKS) {
      await page.goto('/'); // reset between clicks
      const navLink = page.getByRole('link', { name: link.name }).first();
      await expect(navLink, `nav link ${link.name} present`).toBeVisible();
      await navLink.click();
      await expect(page).toHaveURL(link.expectedPath);
    }

    expect(filterAppErrors(errors())).toEqual([]);
  });

  test('Sponsor nav link routes to sponsor.html', async ({ page }) => {
    await page.goto('/');
    const sponsorLink = page.locator('nav a[href="sponsor.html"]').first();
    await expect(sponsorLink).toBeVisible();
    await sponsorLink.click();
    await expect(page).toHaveURL(/sponsor\.html/);
    // Black subpage header has the page title
    await expect(page.getByRole('heading', { level: 1, name: /Sponsorship Store/i })).toBeVisible();
  });

  test('logo always returns to index.html', async ({ page }) => {
    await page.goto('/mission.html');
    const logoLink = page.locator('nav a.nmw-logo-block').first();
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute('href', /index\.html/);
  });
});
