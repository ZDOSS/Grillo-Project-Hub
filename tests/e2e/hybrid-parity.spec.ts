import { test, expect } from "@playwright/test";

test("web app shows the same shell labels across both distributions", async ({ page }) => {
  await page.goto("/");
  // Dismiss the auto-opening New Project modal so the test can interact with the shell
  await page.keyboard.press("Escape");
  await expect(page.getByText("Grillo Project Hub").first()).toBeVisible();
  await expect(page.getByRole("complementary", { name: /primary navigation/i })).toBeVisible();
});

test("a user can create a project and see the board", async ({ page }) => {
  await page.goto("/");
  // The first-run modal is open. Click Create (or Cancel to use the "blank" path then create).
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/board/);
  await expect(page.getByText(/To Do/i)).toBeVisible();
});

test("opening the command palette lists navigation commands", async ({ page }) => {
  await page.goto("/");
  // Create a project first so the navigation commands are useful
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/board/);
  // Wait for the AppShell to register core commands (effects run after first paint)
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: /Search \/ Commands/i }).click();
  await expect(page.getByPlaceholder(/Search commands/i)).toBeVisible();
  // Type a query to filter to the navigation group
  await page.getByPlaceholder(/Search commands/i).fill("board");
  await expect(page.getByText("Go to board")).toBeVisible();
});

test("toggling theme switches between light and dark", async ({ page }) => {
  await page.goto("/");
  // Create project first to dismiss the modal so the header toggle is accessible
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/board/);
  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await page.getByRole("button", { name: /toggle theme/i }).click();
  const nextTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(initialTheme).not.toBe(nextTheme);
});
