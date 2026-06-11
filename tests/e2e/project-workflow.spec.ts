import { test, expect } from "@playwright/test";

test("the user can create an item, change its status, and see the activity log", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/board/);
  // Open new item dialog with the C shortcut
  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: /create work item/i })).toBeVisible();
  await page.getByRole("dialog").getByRole("textbox").first().fill("Test task from E2E");
  await page.getByRole("button", { name: "Create" }).click();
  // Item drawer should open
  await expect(page.getByRole("dialog", { name: /work item/i })).toBeVisible();
  // Close
  await page.keyboard.press("Escape");
  // Card should appear on the board
  await expect(page.getByText("Test task from E2E")).toBeVisible();
});

test("export downloads a JSON project bundle", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/board/);
  // Navigate to settings and export
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Export & import" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /JSON/i }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pms\.json$/);
});

test("search finds items by title", async ({ page }) => {
  await page.goto("/");
  // The first-run modal is open. Click Create.
  await expect(page.locator(".modal-backdrop").first()).toBeVisible();
  await page.locator(".modal-footer button.btn-primary").click();
  await expect(page).toHaveURL(/\/board/);
  // Use the C shortcut to create an item with a known title
  await page.locator(".app-main").click();
  await page.keyboard.press("c");
  await expect(page.locator(".modal").getByText("New work item")).toBeVisible();
  await page.locator(".modal .input").first().fill("Findable unicorn");
  await page.locator(".modal-footer button.btn-primary").click();
  // Item drawer should open at /item/:id
  await expect(page).toHaveURL(/\/item\//);
  // Close the drawer
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/board/);
  // Open search via palette
  await page.getByRole("button", { name: /Search \/ Commands/i }).click();
  await page.getByPlaceholder(/Search commands/i).fill("unicorn");
  await page.waitForTimeout(300);
  await expect(page.locator(".cmdk-list").getByText("Findable unicorn")).toBeVisible();
});
