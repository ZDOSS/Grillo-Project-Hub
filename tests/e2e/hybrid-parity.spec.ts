import { test, expect } from "@playwright/test";
import { createProjectFromLauncher } from "./project-launcher";

test("web app shows the same shell labels across both distributions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner", { name: /Grillo Project Hub/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /workspace/i })).toBeVisible();
});

test("a user can create a project and see the board", async ({ page }) => {
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);
  await page.getByRole("link", { name: "Board" }).click();
  await expect(page).toHaveURL(/\/board/);
  await expect(page.getByText(/To Do/i)).toBeVisible();
});

test("opening the command palette lists navigation commands", async ({ page }) => {
  await page.goto("/");
  // Create a project first so the navigation commands are useful
  await createProjectFromLauncher(page);
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
  // Create a project first so the in-project header toggle is accessible.
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);
  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const toggle = page.getByRole("button", { name: /switch to (light|dark) mode/i });
  await toggle.click();
  const nextTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(initialTheme).not.toBe(nextTheme);
});

test("appearance presets apply through the semantic theme runtime", async ({ page }) => {
  await page.goto("/");
  await createProjectFromLauncher(page);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("tab", { name: "Appearance" }).click();

  await page.getByRole("radio", { name: /Graphite/i }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.themeId)).toBe("graphite");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gph.appearance.v2") ?? "{}").selectedThemeId)).toBe("graphite");
});

test("mobile shell exposes workspace navigation from the header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);

  await page.getByRole("button", { name: "Open workspace navigation" }).click();
  const sheet = page.getByRole("dialog", { name: "Workspace navigation" });

  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("navigation", { name: "Mobile workspace navigation" })).toBeVisible();

  await sheet.getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar/);
  await expect(sheet).not.toBeVisible();
});

test("project header actions remain inside a tablet-height viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);

  for (const name of ["Save now", "Switch project", "Close project"]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box, `${name} should be visible`).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(720);
  }
});

test("mobile project and settings screens do not overflow the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);

  const expectNoPageOverflow = async () => {
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  };

  await expectNoPageOverflow();
  await page.getByRole("button", { name: "Open workspace navigation" }).click();
  const sheet = page.getByRole("dialog", { name: "Workspace navigation" });
  await sheet.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings/);
  await expectNoPageOverflow();

  await page.getByRole("tab", { name: "Appearance" }).click();
  const appearancePanel = page.getByRole("tabpanel", { name: "Appearance" });
  await expect(appearancePanel).toBeVisible();
  const panelBox = await appearancePanel.boundingBox();
  expect(panelBox, "Appearance content should be present in the first mobile viewport").not.toBeNull();
  expect(panelBox!.y).toBeLessThan(844);
});
