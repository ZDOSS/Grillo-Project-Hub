import type { Page } from "@playwright/test";

export async function createProjectFromLauncher(page: Page): Promise<void> {
  await page.getByRole("button", { name: "New project", exact: true }).first().click();
  await page.locator(".modal").getByRole("button", { name: "Create", exact: true }).click();
}
