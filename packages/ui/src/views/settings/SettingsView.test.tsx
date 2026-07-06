import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate, exportProjectJson } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { ThemeProvider } from "../../theme/theme-provider";
import { SettingsView } from "./SettingsView";

describe("SettingsView", () => {
  beforeEach(() => {
    cleanup();
    const bundle = buildProjectFromTemplate("software-project", "Settings");
    useProjectStore.setState({
      bundle,
      storageKey: bundle.project.id,
      storagePath: null,
      storageTrust: "browser",
      isDirty: false,
      lastSource: null
    });
    useProjectStore.getState().applyCommand({
      type: "member.create",
      projectId: bundle.project.id,
      displayName: "Ada"
    });
  });

  it("uses inline confirmation before removing a member", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("tab", { name: "Members" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByText(/Remove Ada from this project/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirm remove" }));

    expect(useProjectStore.getState().bundle?.core.members[0].archived).toBe(true);
  });

  it("resets member edit state when the bundle updates underneath the row", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    const membersTab = screen.getAllByRole("tab", { name: "Members" }).at(-1);
    expect(membersTab).toBeDefined();
    await userEvent.click(membersTab!);
    const editButton = screen.getAllByRole("button", { name: /edit/i }).at(-1);
    expect(editButton).toBeDefined();
    await userEvent.click(editButton!);

    const input = screen.getByDisplayValue("Ada");
    await userEvent.clear(input);
    await userEvent.type(input, "Temp");

    const current = useProjectStore.getState().bundle!;
    useProjectStore.setState({
      ...useProjectStore.getState(),
      bundle: {
        ...current,
        core: {
          ...current.core,
          members: current.core.members.map((entry) =>
            entry.id === current.core.members[0].id ? { ...entry, displayName: "Grace" } : entry
          )
        }
      }
    });

    await waitFor(() => {
      expect(screen.getByText("Grace")).toBeInTheDocument();
    });
    expect(screen.queryByDisplayValue("Temp")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("creates previews toggles and deletes automation rules from settings", async () => {
    const bundle = useProjectStore.getState().bundle!;
    useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Automation target",
      statusId: "inbox"
    });

    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("tab", { name: "Automation" }));
    await userEvent.type(screen.getByLabelText("Rule name"), "Tag new bugs");
    await userEvent.selectOptions(screen.getByLabelText("Automation trigger"), "item.created");
    await userEvent.selectOptions(screen.getByLabelText("Condition type"), "bug");
    await userEvent.selectOptions(screen.getByLabelText("Automation action"), "addLabel");
    await userEvent.selectOptions(screen.getByLabelText("Action label"), screen.getByRole("option", { name: "frontend" }).getAttribute("value") ?? "");
    await userEvent.selectOptions(screen.getByLabelText("Preview item"), screen.getByRole("option", { name: "Automation target" }).getAttribute("value") ?? "");
    await userEvent.click(screen.getByRole("button", { name: "Preview rule" }));

    expect(screen.getByText(/would add label frontend/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save automation rule" }));

    expect(screen.getByText("Tag new bugs")).toBeInTheDocument();
    expect(((useProjectStore.getState().bundle!.modules["builtin.automation"].data as { rules?: unknown[] }).rules ?? [])).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Disable Tag new bugs" }));
    expect(((useProjectStore.getState().bundle!.modules["builtin.automation"].data as { rules?: Array<{ enabled: boolean }> }).rules ?? [])[0].enabled).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Delete Tag new bugs" }));
    expect(((useProjectStore.getState().bundle!.modules["builtin.automation"].data as { rules?: unknown[] }).rules ?? [])).toHaveLength(0);
  });

  it("updates workflow triage gate settings", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("tab", { name: "Workflow" }));
    await userEvent.click(screen.getByLabelText("Require severity or priority before bugs leave intake"));

    expect(useProjectStore.getState().bundle!.modules["builtin.bugs"].config.requireSeverityOrPriority).toBe(true);
  });

  it("splits settings into focused working panels", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    const tablist = screen.getByRole("tablist", { name: "Settings sections" });
    for (const name of [
      "General",
      "Appearance",
      "Storage",
      "Views",
      "Members",
      "Workflow",
      "Labels & milestones",
      "Custom fields",
      "Plugins & trust",
      "Automation",
      "Import & export",
      "AI bridge"
    ]) {
      expect(within(tablist).getByRole("tab", { name })).toBeInTheDocument();
    }

    await userEvent.click(within(tablist).getByRole("tab", { name: "Appearance" }));
    expect(screen.getByRole("tabpanel", { name: "Appearance" })).toContainElement(screen.getByLabelText("Theme"));

    await userEvent.click(within(tablist).getByRole("tab", { name: "Storage" }));
    expect(screen.getByRole("tabpanel", { name: "Storage" })).toHaveTextContent("Browser-local");

    await userEvent.click(within(tablist).getByRole("tab", { name: "Workflow" }));
    const workflowPanel = screen.getByRole("tabpanel", { name: "Workflow" });
    expect(workflowPanel).toHaveTextContent("Workflow statuses");
    expect(workflowPanel).toHaveTextContent("Priorities");
    expect(workflowPanel).toHaveTextContent("Work item types");
    expect(within(workflowPanel).getByLabelText("Require severity or priority before bugs leave intake")).toBeInTheDocument();

    await userEvent.click(within(tablist).getByRole("tab", { name: "Labels & milestones" }));
    const labelPanel = screen.getByRole("tabpanel", { name: "Labels & milestones" });
    expect(within(labelPanel).getByPlaceholderText("Label name")).toBeInTheDocument();
    expect(within(labelPanel).getByPlaceholderText("Milestone name")).toBeInTheDocument();
  });

  it("supports keyboard navigation across settings sections", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    const tablist = screen.getByRole("tablist", { name: "Settings sections" });
    const generalTab = within(tablist).getByRole("tab", { name: "General" });
    generalTab.focus();

    await userEvent.keyboard("{ArrowDown}");
    const appearanceTab = within(tablist).getByRole("tab", { name: "Appearance" });
    expect(appearanceTab).toHaveFocus();
    expect(appearanceTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Appearance" })).toBeInTheDocument();

    await userEvent.keyboard("{End}");
    const bridgeTab = within(tablist).getByRole("tab", { name: "AI bridge" });
    expect(bridgeTab).toHaveFocus();
    expect(bridgeTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "AI bridge" })).toBeInTheDocument();

    await userEvent.keyboard("{Home}");
    expect(generalTab).toHaveFocus();
    expect(generalTab).toHaveAttribute("aria-selected", "true");
  });

  it("preserves unsaved panel drafts when switching settings sections", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    const tablist = screen.getByRole("tablist", { name: "Settings sections" });
    await userEvent.click(within(tablist).getByRole("tab", { name: "Workflow" }));

    const workflowPanel = screen.getByRole("tabpanel", { name: "Workflow" });
    const statusNameInput = within(workflowPanel).getAllByPlaceholderText("Name")[0];
    await userEvent.type(statusNameInput, "Draft status");

    await userEvent.click(within(tablist).getByRole("tab", { name: "Appearance" }));
    expect(screen.getByRole("tabpanel", { name: "Appearance" })).toBeInTheDocument();

    await userEvent.click(within(tablist).getByRole("tab", { name: "Workflow" }));
    expect(within(screen.getByRole("tabpanel", { name: "Workflow" })).getByDisplayValue("Draft status")).toBeInTheDocument();
  });

  it("shows truthful AI bridge status and command coverage instead of placeholder install instructions", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("tab", { name: "AI bridge" }));
    const bridgePanel = screen.getByRole("tabpanel", { name: "AI bridge" });

    expect(bridgePanel).toHaveTextContent("No installable bridge is shipped yet");
    expect(bridgePanel).toHaveTextContent("Core command coverage");
    expect(bridgePanel).toHaveTextContent("Work items");
    expect(bridgePanel).toHaveTextContent("Documents");
    expect(bridgePanel).toHaveTextContent("Search");
    expect(bridgePanel).not.toHaveTextContent("@gph/bridge");
    expect(bridgePanel).not.toHaveTextContent("placeholder");
    expect(bridgePanel).not.toHaveTextContent("Paste the snippet");
  });

  it("summarizes import and export actions in the import/export panel", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <SettingsView />
        </MemoryRouter>
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("tab", { name: "Import & export" }));
    const panel = screen.getByRole("tabpanel", { name: "Import & export" });

    expect(within(panel).getByText("Portable JSON bundle")).toBeInTheDocument();
    expect(within(panel).getByText("Clean print preview")).toBeInTheDocument();

    const incoming = buildProjectFromTemplate("bug-tracker", "Imported Bug Tracker");
    const file = new File([exportProjectJson(incoming)], "project.pms.json", { type: "application/json" });
    await userEvent.upload(within(panel).getByLabelText("Import project bundle"), file);

    await waitFor(() => {
      expect(within(panel).getByText(/Imported Bug Tracker/i)).toBeInTheDocument();
    });
    expect(useProjectStore.getState().bundle?.project.name).toBe("Imported Bug Tracker");
  });
});
