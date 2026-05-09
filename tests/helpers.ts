import { Page, expect } from '@playwright/test';

/**
 * Wipes the app's localStorage before each test for a clean slate.
 * Must be called after navigating (localStorage is per-origin).
 */
export async function resetAppState(page: Page) {
  await page.evaluate(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('nmw.'))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (_) { /* ignore */ }
  });
}

/**
 * Collects console errors and uncaught page errors throughout the page lifetime.
 * Returns an accessor function so tests can assert at the end.
 */
export function collectConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return () => errors.slice();
}

/** Filter out third-party noise we can't fix in a static prototype / sandboxed env. */
export function filterAppErrors(errors: string[]): string[] {
  return errors.filter((e) => {
    if (/cdn\.tailwindcss\.com/i.test(e)) return false;
    if (/lucide/i.test(e)) return false;
    if (/fonts\.googleapis\.com/i.test(e)) return false;
    if (/fonts\.gstatic\.com/i.test(e)) return false;
    if (/unpkg\.com/i.test(e)) return false;
    // Tailwind CDN warns about production use — informational
    if (/should not be used in production/i.test(e)) return false;
    // Sandboxed envs can block external CDN cert validation
    if (/ERR_CERT_AUTHORITY_INVALID/i.test(e)) return false;
    if (/Failed to load resource/i.test(e)) return false;
    // External-CDN globals are guarded by the app (typeof tailwind check, etc.)
    if (/tailwind is not defined/i.test(e)) return false;
    if (/lucide is not defined/i.test(e)) return false;
    return true;
  });
}

/** Pages we expect to load with a 200 and no broken nav. */
export const ALL_PAGES = [
  '/',
  '/index.html',
  '/mission.html',
  '/events.html',
  '/dj-call.html',
  '/apply.html',
  '/faq.html',
  '/alerts.html',
  '/sponsor.html',
  '/dashboard.html',
  '/admin.html',
  '/verify.html',
];
