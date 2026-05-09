import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterAppErrors } from './helpers';

test.describe('FAQ — segmented by product', () => {
  test('default tab shows Events questions', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/faq.html');
    // Events tab is active
    await expect(page.locator('#productTabs button').first()).toContainText(/NMW Events/i);
    // First Events question is rendered
    await expect(page.getByText(/What is New Music Wednesdays\?/i)).toBeVisible();
    // Sponsors-only questions hidden
    await expect(page.getByText(/What does sponsoring NMW look like\?/i)).toBeHidden();
    expect(filterAppErrors(errors())).toEqual([]);
  });

  test('tab switching swaps questions', async ({ page }) => {
    await page.goto('/faq.html');
    await page.locator('[data-prod="sponsors"]').click();
    await expect(page.getByText(/What does sponsoring NMW look like\?/i)).toBeVisible();
    await expect(page.getByText(/What is New Music Wednesdays\?/i)).toBeHidden();

    await page.locator('[data-prod="djcall"]').click();
    await expect(page.getByText(/What is the NMW DJ Call\?/i)).toBeVisible();
  });

  test('clicking a question expands it', async ({ page }) => {
    await page.goto('/faq.html');
    const summary = page.locator('details summary').first();
    await summary.click();
    // <details> open attribute should be set
    const isOpen = await summary.evaluate((el) => (el.parentElement as HTMLDetailsElement).open);
    expect(isOpen).toBe(true);
  });
});

test.describe('Events page', () => {
  test('shows featured event with availability tag', async ({ page }) => {
    await page.goto('/events.html');

    // Featured event card rendered
    await expect(page.locator('#featuredWrap')).toBeVisible();
    await expect(page.getByText(/This Wednesday/i).first()).toBeVisible();

    // RSVP link points to newmusicwednesdayslive.com
    const rsvp = page.getByRole('link', { name: /^RSVP$/ }).first();
    await expect(rsvp).toBeVisible();
    const href = await rsvp.getAttribute('href');
    expect(href).toContain('newmusicwednesdayslive.com');
    expect(href).toMatch(/\d{4}-\d{2}-\d{2}-19-00/); // YYYY-MM-DD-19-00
  });

  test('range selector changes number of upcoming events shown', async ({ page }) => {
    await page.goto('/events.html');
    const initialCount = await page.locator('#eventList article').count();
    expect(initialCount).toBe(8);

    await page.locator('#rangeSel').selectOption('12');
    await expect(page.locator('#eventList article')).toHaveCount(12);

    await page.locator('#rangeSel').selectOption('4');
    await expect(page.locator('#eventList article')).toHaveCount(4);
  });

  test('add-weekly-to-calendar link is recurring', async ({ page }) => {
    await page.goto('/events.html');
    const cal = page.locator('#recurringCal');
    await expect(cal).toBeVisible();
    const href = await cal.getAttribute('href');
    expect(href).toContain('calendar.google.com');
    expect(href).toContain('RRULE%3AFREQ%3DWEEKLY%3BBYDAY%3DWE');
  });
});

test.describe('Mission page', () => {
  test('renders and links to apply', async ({ page }) => {
    await page.goto('/mission.html');
    await expect(page.getByRole('heading', { level: 1, name: /Mission/i })).toBeVisible();
    await expect(page.getByText(/CL Llewellyn/)).toBeVisible();
    const cta = page.getByRole('link', { name: /Take The Stage/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /apply\.html/);
  });
});
