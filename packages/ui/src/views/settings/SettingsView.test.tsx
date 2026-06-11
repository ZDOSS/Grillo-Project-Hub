import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { ThemeProvider } from "../../theme/theme-provider";
import { SettingsView } from "./SettingsView";

describe("SettingsView", () => {
  beforeEach(() => {
    const bundle = buildProjectFromTemplate("software-project", "Settings");
    const withMember = useProjectStore.getState().bundle
      ? useProjectStore.getState().bundle
      : bundle;
    useProjectStore.setState({
      bundle: withMember,
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
});
