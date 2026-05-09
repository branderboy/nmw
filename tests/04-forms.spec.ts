import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterAppErrors, resetAppState } from './helpers';

test.describe('Get Alerts (The Blast) form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/alerts.html');
    await resetAppState(page);
    await page.reload();
  });

  test('subscribes to The Blast and shows success card', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/alerts.html');

    await page.locator('input[name="email"]').fill('blast-test@example.com');
    await page.locator('input[name="name"]').fill('Test Person');
    await page.locator('select[name="genre"]').selectOption('R&B');
    await page.getByRole('button', { name: /Subscribe to The Blast/i }).click();

    await expect(page.locator('#successCard')).toBeVisible();
    await expect(page.getByRole('heading', { name: /You're on the list/i })).toBeVisible();

    // Persisted to localStorage
    const blast = await page.evaluate(() => {
      const raw = localStorage.getItem('nmw.blast');
      return raw ? JSON.parse(raw) : null;
    });
    expect(blast).not.toBeNull();
    expect(blast.length).toBe(1);
    expect(blast[0].email).toBe('blast-test@example.com');

    expect(filterAppErrors(errors())).toEqual([]);
  });

  test('blocks submit when email is missing (HTML5 validation)', async ({ page }) => {
    await page.goto('/alerts.html');
    await page.getByRole('button', { name: /Subscribe to The Blast/i }).click();
    // Form should not have submitted — success card hidden
    await expect(page.locator('#successCard')).toBeHidden();
    // Email field is invalid
    const isInvalid = await page.locator('input[name="email"]').evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(isInvalid).toBe(true);
  });

  test('topic chips toggle on/off', async ({ page }) => {
    await page.goto('/alerts.html');
    const eventsChip = page.locator('[data-topic="Events"]');
    await expect(eventsChip).toHaveClass(/selected/); // Events preselected

    await eventsChip.click();
    await expect(eventsChip).not.toHaveClass(/selected/);

    await eventsChip.click();
    await expect(eventsChip).toHaveClass(/selected/);
  });
});

test.describe('Sponsor store form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sponsor.html');
    await resetAppState(page);
    await page.reload();
  });

  test('add product to cart updates count and estimate', async ({ page }) => {
    await page.goto('/sponsor.html');
    // Cart starts empty
    await expect(page.locator('#cartCount')).toHaveText('0');

    // Add a bundle
    await page.locator('[data-add="single-night"]').click();
    await expect(page.locator('#cartCount')).toHaveText('1');
    await expect(page.locator('#cartTotal')).toContainText('$15,000');

    // Add à la carte item
    await page.locator('[data-add="branded-segment"]').click();
    await expect(page.locator('#cartCount')).toHaveText('2');
    await expect(page.locator('#cartTotal')).toContainText('$22,500');
  });

  test('submit sponsor inquiry saves to store with pending_approval', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/sponsor.html');

    await page.locator('[data-add="branded-segment"]').click();

    // Scroll into form
    await page.locator('#contactForm').scrollIntoViewIfNeeded();

    await page.locator('input[name="name"]').fill('Jane Doe');
    await page.locator('input[name="company"]').fill('Acme Brand');
    await page.locator('input[name="email"]').fill('jane@acme.com');
    await page.locator('input[name="phone"]').fill('5551234567');
    await page.locator('input[name="website"]').fill('https://acme.com');
    await page.locator('select[name="orgType"]').selectOption('Brand');
    await page.locator('select[name="budget"]').selectOption('$15K – $50K');
    await page.locator('textarea[name="goal"]').fill('Q4 brand activation around live music');

    // Pick contact prefs
    await page.locator('[data-val="Email"]').click();
    await page.locator('[data-val="12pm–3pm"]').click();

    await page.getByRole('button', { name: /Submit For Approval/i }).click();

    await expect(page.locator('#successCard')).toBeVisible();

    const sponsors = await page.evaluate(() => {
      const raw = localStorage.getItem('nmw.sponsors');
      return raw ? JSON.parse(raw) : null;
    });
    expect(sponsors).not.toBeNull();
    expect(sponsors.length).toBe(1);
    expect(sponsors[0].status).toBe('pending_approval');
    expect(sponsors[0].interests).toContain('Branded Segment Sponsorship');
    expect(sponsors[0].preferredContact).toBe('Email');
    expect(sponsors[0].bestTime).toBe('12pm–3pm');

    expect(filterAppErrors(errors())).toEqual([]);
  });

  test('blocks submit when contact prefs are missing', async ({ page }) => {
    page.on('dialog', (d) => d.accept()); // accept the validation alert
    await page.goto('/sponsor.html');
    await page.locator('input[name="name"]').fill('No Contact');
    await page.locator('input[name="company"]').fill('NC');
    await page.locator('input[name="email"]').fill('nc@nc.co');
    await page.locator('textarea[name="goal"]').fill('test');
    await page.getByRole('button', { name: /Submit For Approval/i }).click();
    // Success card should not be visible — validation blocks
    await expect(page.locator('#successCard')).toBeHidden();
  });
});

test.describe('DJ Call form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dj-call.html');
    await resetAppState(page);
    await page.reload();
  });

  test('submits DJ application and persists', async ({ page }) => {
    await page.goto('/dj-call.html');
    await page.locator('input[name="djName"]').fill('DJ Test');
    await page.locator('input[name="email"]').fill('dj@test.co');
    await page.locator('input[name="city"]').fill('Brooklyn');
    await page.locator('select[name="genre"]').selectOption('R&B');

    await page.getByRole('button', { name: /Submit DJ Application/i }).click();

    await expect(page.locator('#successCard')).toBeVisible();

    const djs = await page.evaluate(() => JSON.parse(localStorage.getItem('nmw.djs') || '[]'));
    expect(djs).toHaveLength(1);
    expect(djs[0].djName).toBe('DJ Test');
  });

  test('shows next call date and add-to-calendar link', async ({ page }) => {
    await page.goto('/dj-call.html');
    const calLink = page.locator('#calBtn');
    await expect(calLink).toBeVisible();
    const href = await calLink.getAttribute('href');
    expect(href).toContain('calendar.google.com');
    expect(href).toContain('RRULE');
  });
});
