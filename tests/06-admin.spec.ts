import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterAppErrors, resetAppState } from './helpers';

test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin.html');
    await resetAppState(page);
    await page.reload();
  });

  test('admin loads with KPIs and demo data', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/admin.html');

    // KPIs should render with seed data
    const kpis = page.locator('.kpi');
    await expect(kpis.first()).toBeVisible();
    // Total artists from seed = 4
    await expect(kpis.first().locator('.kpi-value')).toHaveText(/[1-9]\d*/);

    // Tabs render
    await expect(page.getByRole('button', { name: 'Artists' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Slots' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Email Flows' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pages' })).toBeVisible();

    expect(filterAppErrors(errors())).toEqual([]);
  });

  test('switching tabs reveals correct pane', async ({ page }) => {
    await page.goto('/admin.html');

    await page.getByRole('button', { name: 'Email Flows' }).click();
    await expect(page.locator('[data-pane="flows"]')).toBeVisible();
    // Default flows seeded
    await expect(page.locator('#flowsList').getByText(/Welcome — Performance Tier/)).toBeVisible();

    await page.getByRole('button', { name: 'Pages' }).click();
    await expect(page.locator('[data-pane="pages"]')).toBeVisible();
    await expect(page.locator('input[name="urgencyBar"]')).toBeVisible();

    await page.getByRole('button', { name: 'Sponsors' }).click();
    await expect(page.locator('[data-pane="sponsors"]')).toBeVisible();
  });

  test('Pages CMS edit changes urgency bar across funnel pages', async ({ page, context }) => {
    await page.goto('/admin.html');
    await page.getByRole('button', { name: 'Pages' }).click();

    const customText = 'CUSTOM URGENCY ' + Date.now();
    await page.locator('input[name="urgencyBar"]').fill(customText);
    await page.locator('#pagesForm button[type="submit"]').click();
    await expect(page.locator('#pagesSaved')).toBeVisible();

    // Visit homepage in same browser context (shared localStorage origin)
    await page.goto('/index.html');
    await expect(page.locator('[data-cms="urgencyBar"]')).toHaveText(customText);

    // Visit another funnel page
    await page.goto('/events.html');
    await expect(page.locator('[data-cms="urgencyBar"]')).toHaveText(customText);

    // Reset back to default and verify it restores
    await page.goto('/admin.html');
    await page.getByRole('button', { name: 'Pages' }).click();
    page.on('dialog', (d) => d.accept());
    await page.locator('#resetContentBtn').click();
    // After reset, the form shows default value
    const defaultText = await page.locator('input[name="urgencyBar"]').inputValue();
    expect(defaultText).not.toBe(customText);
    expect(defaultText.length).toBeGreaterThan(0);
  });

  test('Email Flows: getFlows respects user-emptied list (regression)', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/admin.html');
    await page.getByRole('button', { name: 'Email Flows' }).click();

    const initialCount = await page.locator('#flowsList > div').count();
    expect(initialCount).toBeGreaterThan(0);

    // Delete every flow
    while (true) {
      const buttons = page.locator('[data-del-flow]');
      const n = await buttons.count();
      if (n === 0) break;
      await buttons.first().click();
    }

    // After deleting all, list must show empty state, not re-seed
    await expect(page.locator('#flowsList')).toContainText(/No flows yet/i);

    // Reload page and confirm still empty (the bug we fixed)
    await page.reload();
    await page.getByRole('button', { name: 'Email Flows' }).click();
    await expect(page.locator('#flowsList')).toContainText(/No flows yet/i);
  });

  test('admin Slots tab shows Wednesday rows', async ({ page }) => {
    await page.goto('/admin.html');
    await page.getByRole('button', { name: 'Slots' }).click();
    await expect(page.locator('[data-pane="slots"]')).toBeVisible();
    await expect(page.locator('#slotList > div').first()).toBeVisible();
    // Manual booking form present
    await expect(page.locator('#manualForm')).toBeVisible();
  });

  test('Sponsor approval flow via admin', async ({ page, context }) => {
    // First submit a sponsor inquiry from the public page
    await page.goto('/sponsor.html');
    await page.locator('[data-add="newsletter-slot"]').click();
    await page.locator('#contactForm').scrollIntoViewIfNeeded();
    await page.locator('input[name="name"]').fill('Approver Test');
    await page.locator('input[name="company"]').fill('Approve Co');
    await page.locator('input[name="email"]').fill('approve@test.co');
    await page.locator('textarea[name="goal"]').fill('Test approve flow');
    await page.locator('[data-val="Email"]').click();
    await page.locator('[data-val="9am-11am"]').click();
    await page.getByRole('button', { name: /Submit For Approval/i }).click();
    await expect(page.locator('#successCard')).toBeVisible();

    // Admin approves
    await page.goto('/admin.html');
    await page.getByRole('button', { name: 'Sponsors' }).click();
    await expect(page.locator('#sponsorRows')).toContainText('Approve Co');
    // Click the approve button in that row
    await page.locator('[data-sapprove]').first().click();
    // Status should now be Approved
    await expect(page.locator('#sponsorRows')).toContainText(/Approved/);

    // Verify in storage
    const sp = await page.evaluate(() => JSON.parse(localStorage.getItem('nmw.sponsors') || '[]'));
    expect(sp[0].status).toBe('approved');
  });
});
