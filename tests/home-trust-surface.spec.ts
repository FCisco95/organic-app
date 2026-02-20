import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

test.describe('Home trust surface', () => {
  test('renders trust pulse cards and freshness metadata', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('home-trust-strip')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('trust-updated-at')).toBeVisible();
    await expect(page.getByTestId('trust-refresh-cadence')).toContainText('60');

    await expect(page.getByTestId('trust-card-sprint')).toBeVisible();
    await expect(page.getByTestId('trust-card-proposals')).toBeVisible();
    await expect(page.getByTestId('trust-card-leaderboard')).toBeVisible();
    await expect(page.getByTestId('trust-card-activity')).toBeVisible();
  });
});
