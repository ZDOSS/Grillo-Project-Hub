import { expect, test } from "@playwright/test";

test("the new user tutorial visits every core workspace surface", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("link", { name: "New user tutorial" }).click();
  await expect(page).toHaveURL(/\/tutorial/);
  await expect(page.getByRole("heading", { name: "Learn Grillo by doing" })).toBeVisible();

  await page.getByRole("button", { name: "Start tutorial" }).click();
  await expect(page).toHaveURL(/\/overview/);

  const tutorial = page.getByRole("dialog", { name: "New user tutorial" });
  await expect(tutorial.getByText("Step 1 of 13")).toBeVisible();

  const stops = [
    { button: "Open Board", route: /\/board/, title: "Move work through its workflow" },
    { button: "Open Backlog", route: /\/backlog/, title: "Prioritize what comes next" },
    { button: "Open Table", route: /\/table/, title: "Edit many details efficiently" },
    { button: "Open Roadmap", route: /\/roadmap/, title: "Plan milestones over time" },
    { button: "Open Calendar", route: /\/calendar/, title: "See commitments by date" },
    { button: "Open Docs", route: /\/docs/, title: "Keep decisions beside delivery" },
    { button: "Open Bug triage", route: /\/bugs/, title: "Turn reports into actionable bugs" },
    { button: "Open My work", route: /\/mywork/, title: "Focus each person on their queue" },
    { button: "Open Search", route: /\/search/, title: "Find anything and move quickly" },
    { button: "Open Trash", route: /\/trash/, title: "Recover work before it is gone" },
    { button: "Open Settings", route: /\/settings/, title: "Shape Grillo around the project" },
    { button: "Wrap up", route: /\/overview/, title: "You know your way around Grillo" }
  ];

  for (const stop of stops) {
    await tutorial.getByRole("button", { name: stop.button }).click();
    await expect(page).toHaveURL(stop.route);
    await expect(tutorial.getByRole("heading", { name: stop.title })).toBeVisible();
  }

  await tutorial.getByRole("button", { name: "Finish tutorial" }).click();
  await expect(tutorial).not.toBeVisible();
  await expect(page).toHaveURL(/\/overview/);
});
