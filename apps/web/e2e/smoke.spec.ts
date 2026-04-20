import { test, expect } from '@playwright/test';

test('landing page renders key copy and sends visitors to signup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Spin up an AI influencer/i);
  await page.getByRole('link', { name: /Start free/i }).first().click();
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByRole('heading', { level: 1, name: /Create your studio/i })).toBeVisible();
});

test('login page offers password and magic-link modes', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText(/Welcome back/i)).toBeVisible();
  await page.getByRole('button', { name: /Use a magic link/i }).click();
  await expect(page.getByRole('button', { name: /Email me a link/i })).toBeVisible();
});

test('unauthenticated dashboard redirects to login with next param', async ({ page }) => {
  const res = await page.goto('/dashboard');
  expect(res?.url()).toMatch(/\/login\?next=%2Fdashboard/);
});
