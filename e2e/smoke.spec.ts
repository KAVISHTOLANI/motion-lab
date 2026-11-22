import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('adjust a launch, animate it, compare on Mars', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(3500);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');
  await page.getByRole('link', { name: 'Open the simulator' }).first().click();
  await page.getByLabel('Launch speed', { exact: true }).fill('30');
  await page.getByLabel('Angle', { exact: true }).fill('35');
  await page.getByLabel('Launch height', { exact: true }).fill('10');
  await expect(page.getByTestId('range')).toHaveText(/^\d+\.\d m$/);
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Mars' }).click();
  await expect(page.getByText('Gravity: Mars')).toBeVisible();
  await page.getByLabel('Angle', { exact: true }).fill('-5');
  await expect(page.getByText('Angle must be between 0 and 90.')).toBeVisible();
  await page.getByLabel('Angle', { exact: true }).fill('40');
  await page.waitForTimeout(600);
  await snap(page, 'lab');
  await checkMobile(page);
  await page.reload();
  await expect(page.getByLabel('Angle', { exact: true })).toHaveValue('40');
});
