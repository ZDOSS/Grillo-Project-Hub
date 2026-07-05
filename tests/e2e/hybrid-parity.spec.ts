import { test, expect } from "@playwright/test";

test("web app shows the same shell labels across both distributions", async ({ page }) => {
  await page.goto("/");
  // Dismiss the auto-opening New Project modal so the test can interact with the shell
  await page.keyboard.press("Escape");
  await expect(page.getByRole("banner", { name: /Grillo Project Hub/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /workspace/i })).toBeVisible();
});

test("a user can create a project and see the board", async ({ page }) => {
  await page.goto("/");
  await page.locator(".modal-footer button.btn-primary").click();
  await expect(page).toHaveURL(/\/overview/);
  await page.getByRole("link", { name: "Board" }).click();
  await expect(page).toHaveURL(/\/board/);
  await expect(page.getByText(/To Do/i)).toBeVisible();
});

test("opening the command palette lists navigation commands", async ({ page }) => {
  await page.goto("/");
  // Create a project first so the navigation commands are useful
  await page.locator(".modal-footer button.btn-primary").click();
  await expect(page).toHaveURL(/\/overview/);
  // Wait for the AppShell to register core commands (effects run after first paint)
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: /Search commands/i }).click();
  await expect(page.getByPlaceholder(/Search commands/i)).toBeVisible();
  // Type a query to filter to the navigation group
  await page.getByPlaceholder(/Search commands/i).fill("board");
  await expect(page.getByText("Go to board")).toBeVisible();
});

test("toggling theme switches between light and dark", async ({ page }) => {
  await page.goto("/");
  // Create project first to dismiss the modal so the header toggle is accessible
  await page.locator(".modal-footer button.btn-primary").click();
  await expect(page).toHaveURL(/\/overview/);
  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const toggle = page.getByRole("button", { name: /switch to (light|dark) mode/i });
  await toggle.click();
  const nextTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(initialTheme).not.toBe(nextTheme);
});

test("mobile shell exposes workspace navigation from the header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".modal-footer button.btn-primary").click();
  await expect(page).toHaveURL(/\/overview/);

  await page.getByRole("button", { name: "Open workspace navigation" }).click();
  const sheet = page.getByRole("dialog", { name: "Workspace navigation" });

  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("navigation", { name: "Mobile workspace navigation" })).toBeVisible();

  await sheet.getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar/);
  await expect(sheet).not.toBeVisible();
});
