import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

test.describe('Analytics liveness surface', () => {
  test('renders governance health and trust aggregates', async ({ page }) => {
    test.setTimeout(90_000);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await page.goto(`${BASE_URL}/en/analytics`, {
          waitUntil: 'domcontentloaded',
          timeout: 45_000,
        });
        break;
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }

    await expect(page.getByTestId('analytics-governance-health')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('analytics-trust-updated')).toBeVisible();
    await expect(page.getByTestId('analytics-trust-cadence')).toContainText('120');

    await expect(page.getByTestId('analytics-throughput')).toBeVisible();
    await expect(page.getByTestId('analytics-disputes')).toBeVisible();
    await expect(page.getByTestId('analytics-participation')).toBeVisible();
  });
});
