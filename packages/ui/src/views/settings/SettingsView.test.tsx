import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
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

    await userEvent.click(screen.getByRole("button", { name: "Members" }));
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

    const membersTab = screen.getAllByRole("button", { name: "Members" }).at(-1);
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
});
