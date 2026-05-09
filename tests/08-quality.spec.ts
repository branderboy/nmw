import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterAppErrors, ALL_PAGES } from './helpers';

test.describe('Site-wide quality checks', () => {
  for (const path of ALL_PAGES) {
    test(`${path} has no console errors and no broken images`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);

      // Wait for lucide icons + images to settle
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      const broken = await page.evaluate(() => {
        return Array.from(document.images)
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src);
      });
      expect(broken, `${path} broken images: ${broken.join(', ')}`).toEqual([]);

      const appErrors = filterAppErrors(errors());
      expect(appErrors, `${path} console errors:\n${appErrors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('NMW namespace exposed by assets/nmw.js', () => {
  test('window.NMW exposes expected helpers', async ({ page }) => {
    await page.goto('/');
    const exposed = await page.evaluate(() => {
      const N: any = (window as any).NMW;
      if (!N) return null;
      return {
        hasPACKAGES: Array.isArray(N.PACKAGES) && N.PACKAGES.length > 0,
        hasGOALS: Array.isArray(N.GOALS) && N.GOALS.length > 0,
        hasSPONSOR_STATUS: typeof N.SPONSOR_STATUS === 'object' && N.SPONSOR_STATUS.PENDING === 'pending_approval',
        hasGetSponsors: typeof N.getSponsors === 'function',
        hasSetEvents: typeof N.setEvents === 'function',
        hasApplySiteContent: typeof N.applySiteContent === 'function',
        hasUpcomingWednesdays: typeof N.upcomingWednesdays === 'function',
      };
    });
    expect(exposed).not.toBeNull();
    expect(exposed!.hasPACKAGES).toBe(true);
    expect(exposed!.hasGOALS).toBe(true);
    expect(exposed!.hasSPONSOR_STATUS).toBe(true);
    expect(exposed!.hasGetSponsors).toBe(true);
    expect(exposed!.hasSetEvents).toBe(true);
    expect(exposed!.hasApplySiteContent).toBe(true);
    expect(exposed!.hasUpcomingWednesdays).toBe(true);
  });

  test('upcomingWednesdays returns dates that are all Wednesdays', async ({ page }) => {
    await page.goto('/');
    const isoDates = await page.evaluate(() =>
      (window as any).NMW.upcomingWednesdays(8).map((d: Date) => d.toISOString())
    );
    expect(isoDates).toHaveLength(8);
    for (const iso of isoDates) {
      const day = new Date(iso).getDay();
      expect(day).toBe(3); // Wednesday = 3
    }
  });
});
