import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { closeCreateItem, openCreateItem } from "../commands/palette-bus";
import { useProjectStore } from "../store/project-store";
import { CreateItemDialog } from "./CreateItemDialog";

describe("CreateItemDialog", () => {
  beforeEach(() => {
    cleanup();
    closeCreateItem();
    const bundle = buildProjectFromTemplate("software-project", "Create");
    useProjectStore.setState({ bundle });
  });

  it("refreshes type defaults when the project type registry changes while open", async () => {
    render(
      <MemoryRouter>
        <CreateItemDialog />
      </MemoryRouter>
    );

    act(() => openCreateItem({ typeId: "task" }));

    expect(screen.getByLabelText("Status")).toHaveValue("inbox");

    await userEvent.type(screen.getByLabelText("Title"), "Keep my draft");
    await userEvent.type(screen.getByLabelText("Description"), "Do not clear this");

    const current = useProjectStore.getState().bundle!;
    useProjectStore.setState({
      ...useProjectStore.getState(),
      bundle: {
        ...current,
        core: {
          ...current.core,
          itemTypes: current.core.itemTypes.map((type) =>
            type.id === "task" ? { ...type, defaultStatusId: "ready" } : type
          )
        }
      }
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Status")).toHaveValue("ready");
    });
    expect(screen.getByLabelText("Title")).toHaveValue("Keep my draft");
    expect(screen.getByLabelText("Description")).toHaveValue("Do not clear this");
  });
});
