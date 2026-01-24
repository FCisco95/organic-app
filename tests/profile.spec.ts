import { test, expect } from '@playwright/test';

const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

test.describe('Profile stats', () => {
  test('shows submissions, contributions, and points earned', async ({ page }) => {
    test.skip(!email || !password, 'Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD.');

    await page.goto('/login');
    await page.locator('#email').fill(email as string);
    await page.locator('#password').fill(password as string);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/profile');
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible();
    await expect(page.getByText('Activity')).toBeVisible();
    await expect(page.getByText('Total submissions')).toBeVisible();
    await expect(page.getByText('Approved submissions')).toBeVisible();
    await expect(page.getByText('Contributions')).toBeVisible();
    await expect(page.getByText('Points earned')).toBeVisible();
  });
});
