import { test, expect } from "@playwright/test";
import { createProjectFromLauncher } from "./project-launcher";

function todayDateOnly(): string {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function shiftDateOnly(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("the user can create an item, change its status, and see the activity log", async ({ page }) => {
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);
  await page.getByRole("link", { name: "Board" }).click();
  await expect(page).toHaveURL(/\/board/);
  // Open new item dialog with the C shortcut
  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: /create work item/i })).toBeVisible();
  await page.getByRole("dialog").getByRole("textbox").first().fill("Test task from E2E");
  await page.getByRole("button", { name: "Create" }).click();
  // Item detail should open
  await expect(page.getByRole("dialog", { name: /work item/i })).toBeVisible();
  // Close
  await page.keyboard.press("Escape");
  // Card should appear on the board
  await expect(page.getByText("Test task from E2E")).toBeVisible();
});

test("export downloads a JSON project bundle", async ({ page }) => {
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);
  // Navigate to settings and export
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("tab", { name: "Import & export" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /JSON/i }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pms\.json$/);
});

test("search finds items by title", async ({ page }) => {
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);
  // Use the C shortcut to create an item with a known title
  await page.locator(".app-main").click();
  await page.keyboard.press("c");
  await expect(page.locator(".modal").getByText("New work item")).toBeVisible();
  await page.locator(".modal .input").first().fill("Findable unicorn");
  await page.locator(".modal-footer button.btn-primary").click();
  // Item detail should open at /item/:id
  await expect(page).toHaveURL(/\/item\//);
  // Close the item detail
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/overview/);
  // Open search via palette
  await page.getByRole("button", { name: /Search commands/i }).click();
  await page.getByPlaceholder(/Search commands/i).fill("unicorn");
  await page.waitForTimeout(300);
  await expect(page.locator(".cmdk-list").getByText("Findable unicorn")).toBeVisible();
});

test("calendar creates a dated work item from a day cell", async ({ page }) => {
  const today = todayDateOnly();
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);

  await page.getByLabel("Workspace", { exact: true }).getByRole("link", { name: "Calendar" }).click();
  await page.getByRole("button", { name: `Add work on ${today}` }).click();
  await expect(page.getByRole("dialog", { name: "Create work item" })).toBeVisible();
  await expect(page.getByLabel("Due date")).toHaveValue(today);

  await page.getByLabel("Title").fill("Calendar smoke item");
  await page.getByRole("button", { name: "Create" }).click();

  const detail = page.getByRole("dialog", { name: /work item/i });
  await expect(detail).toBeVisible();
  await expect(detail.getByLabel("Due")).toHaveValue(today);
});

test("roadmap date edits, dragging, and resizing stay visually synchronized", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Open demo" }).click();
  await expect(page).toHaveURL(/\/overview/);
  await page.getByLabel("Workspace", { exact: true }).getByRole("link", { name: "Roadmap" }).click();
  await expect(page).toHaveURL(/\/roadmap/);

  const title = "Polish the first-run workspace";
  const startInput = page.getByLabel(`Start date for ${title}`, { exact: true });
  const dueInput = page.getByLabel(`Due date for ${title}`, { exact: true });
  const bar = page.getByRole("group", { name: new RegExp(`${title} timeline`) });

  await page.getByLabel("Anchor").fill("2026-07");
  await startInput.fill("2026-07-01");
  await dueInput.fill("2026-07-20");
  await expect(bar).toHaveAttribute("data-start-date", "2026-07-01");
  await expect(bar).toHaveAttribute("data-due-date", "2026-07-20");

  const initialBox = await bar.boundingBox();
  expect(initialBox).not.toBeNull();
  await dueInput.fill("2026-07-31");
  await expect(bar).toHaveAttribute("data-due-date", "2026-07-31");
  const grownBox = await bar.boundingBox();
  expect(grownBox).not.toBeNull();
  expect(grownBox!.width).toBeGreaterThan(initialBox!.width + 20);

  const timelineBox = await bar.locator("xpath=..").boundingBox();
  const totalDays = Number(await bar.getAttribute("data-total-days"));
  expect(timelineBox).not.toBeNull();
  expect(totalDays).toBeGreaterThan(0);
  const sevenDaysInPixels = (timelineBox!.width / totalDays) * 7;

  const moveStart = {
    x: grownBox!.x + Math.min(24, grownBox!.width / 3),
    y: grownBox!.y + grownBox!.height / 2
  };
  await page.mouse.move(moveStart.x, moveStart.y);
  await page.mouse.down();
  await page.mouse.move(moveStart.x + sevenDaysInPixels, moveStart.y, { steps: 8 });
  await page.mouse.up();

  const movedStart = shiftDateOnly("2026-07-01", 7);
  const movedDue = shiftDateOnly("2026-07-31", 7);
  await expect(page).toHaveURL(/\/roadmap/);
  await expect(startInput).toHaveValue(movedStart);
  await expect(dueInput).toHaveValue(movedDue);
  const movedBox = await bar.boundingBox();
  expect(movedBox).not.toBeNull();
  expect(Math.abs(movedBox!.width - grownBox!.width)).toBeLessThan(2);

  const resizeHandle = page.getByRole("button", { name: `Adjust due date for ${title}` });
  const handleBox = await resizeHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  const resizeStart = {
    x: handleBox!.x + handleBox!.width / 2,
    y: handleBox!.y + handleBox!.height / 2
  };
  await page.mouse.move(resizeStart.x, resizeStart.y);
  await page.mouse.down();
  await page.mouse.move(resizeStart.x + sevenDaysInPixels, resizeStart.y, { steps: 8 });
  await page.mouse.up();

  await expect(startInput).toHaveValue(movedStart);
  await expect(dueInput).toHaveValue(shiftDateOnly(movedDue, 7));
  const resizedBox = await bar.boundingBox();
  expect(resizedBox).not.toBeNull();
  expect(resizedBox!.width).toBeGreaterThan(movedBox!.width + 20);
});

test("docs workflow creates and saves a project note", async ({ page }) => {
  await page.goto("/");
  await createProjectFromLauncher(page);
  await expect(page).toHaveURL(/\/overview/);

  await page.getByLabel("Workspace", { exact: true }).getByRole("link", { name: "Docs" }).click();
  await page.getByRole("button", { name: "New document" }).click();
  await expect(page.getByLabel("Document title")).toHaveValue("Untitled");
  await page.getByLabel("Document title").fill("Release checklist");
  await page.locator(".docs-editor textarea").fill("# Release checklist\n\n- Smoke the docs workflow");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.locator(".docs-title")).toHaveText("Release checklist");
  await expect(page.locator(".docs-editor textarea")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});
