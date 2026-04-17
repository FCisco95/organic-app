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

  // Regression: mobile QA iteration 4 — trigger width caused right-edge
  // overflow on narrow viewports in long-text locales (pt-PT "Português").
  // Fix hides the language name on <sm screens while keeping the trigger
  // (and its dropdown) fully interactive, and preserves the 44px touch target.
  test('language switcher trigger fits narrow viewport without overflow (pt-PT)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/pt-PT`);

    const trigger = page.getByRole('button', { name: /Português/ }).first();
    await expect(trigger).toBeVisible();

    const box = await trigger.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Trigger must not extend past the viewport right edge
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      // Still meets the 44px touch-target minimum
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // Dropdown still opens and is visible (regression check for the earlier
    // overflow-hidden fix that clipped the absolutely-positioned menu)
    await trigger.click();
    await expect(page.getByRole('menuitem', { name: /English/ })).toBeVisible();
  });
});
