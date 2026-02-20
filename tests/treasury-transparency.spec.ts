import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

test.describe('Treasury transparency surface', () => {
  test('shows emission policy, settlement status, and transparency metadata', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/treasury`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('treasury-transparency-panel')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('treasury-trust-updated')).toBeVisible();
    await expect(page.getByTestId('treasury-trust-cadence')).toContainText('60');

    await expect(page.getByTestId('treasury-policy-emission')).toBeVisible();
    await expect(page.getByTestId('treasury-policy-fixed-cap')).toBeVisible();
    await expect(page.getByTestId('treasury-policy-carryover')).toBeVisible();

    await expect(page.getByTestId('treasury-latest-settlement-status')).toBeVisible();
    await expect(page.getByTestId('treasury-latest-settlement-detail')).toBeVisible();

    const auditLink = page.getByTestId('treasury-audit-link');
    await expect(auditLink).toBeVisible();
    await expect(auditLink).toHaveAttribute('href', /admin\/settings/);
  });
});
