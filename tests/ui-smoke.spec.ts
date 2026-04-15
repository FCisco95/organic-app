/**
 * UI smoke tests — catch visible regressions that DOM-level queries miss.
 *
 * These tests use `toBeVisible()` which checks computed style and bounding
 * box, catching the class of bugs where an element exists in the DOM but is
 * clipped by overflow, hidden behind another element, or otherwise invisible.
 *
 * The language switcher dropdown regression (April 2026) would have been
 * caught by this test suite.
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers';

test.describe('UI smoke', () => {
  test('language switcher dropdown is visible after click', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);

    // Click the language button (has the flag emoji and "English" text)
    const trigger = page.getByRole('button', { name: /English/ }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Dropdown items must be actually visible, not just in the DOM.
    // This fails if a parent has `overflow: hidden` that clips the dropdown.
    const ptOption = page.getByRole('menuitem', { name: /Português/ });
    const zhOption = page.getByRole('menuitem', { name: /中文/ });

    await expect(ptOption).toBeVisible();
    await expect(zhOption).toBeVisible();
  });

  test('language switcher navigates to selected locale', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);

    await page.getByRole('button', { name: /English/ }).first().click();
    await page.getByRole('menuitem', { name: /中文/ }).click();

    // URL should update to /zh-CN
    await expect(page).toHaveURL(/\/zh-CN(\/|$|\?)/);
  });
});
