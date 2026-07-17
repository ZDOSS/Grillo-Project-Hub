import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../store/project-store";
import { NewUserTutorial } from "./NewUserTutorial";
import { NewUserTutorialView } from "./NewUserTutorialView";
import {
  endNewUserTutorial,
  getNewUserTutorialSnapshot,
  startNewUserTutorial
} from "./tutorial-state";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("NewUserTutorial", () => {
  beforeEach(() => {
    cleanup();
    endNewUserTutorial();
    sessionStorage.clear();
    useProjectStore.setState({
      bundle: null,
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved",
      isDirty: false,
      lastSource: null,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null
    });
  });

  afterEach(() => {
    cleanup();
    endNewUserTutorial();
  });

  it("starts a disposable demo and opens the guided overview", async () => {
    render(
      <MemoryRouter initialEntries={["/tutorial"]}>
        <Routes>
          <Route path="/tutorial" element={<NewUserTutorialView />} />
          <Route path="/overview" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Start tutorial" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/overview");
    });
    expect(useProjectStore.getState().bundle?.project.name).toBe("Tutorial Project");
    expect(useProjectStore.getState().storageTrust).toBe("unsaved");
    expect(getNewUserTutorialSnapshot()).toEqual({
      active: true,
      projectId: useProjectStore.getState().bundle?.project.id,
      stepIndex: 0
    });
  });

  it("protects an existing unsaved project", () => {
    useProjectStore.setState({
      bundle: buildProjectFromTemplate("software-project", "Unsaved work"),
      storageTrust: "unsaved",
      isDirty: true
    });

    render(
      <MemoryRouter>
        <NewUserTutorialView />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Start tutorial" })).toBeDisabled();
    expect(screen.getByText(/Save or close the current unsaved project/i)).toBeInTheDocument();
  });

  it("moves forward and backward through real feature routes", async () => {
    startNewUserTutorial("tutorial-project");
    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <LocationProbe />
        <NewUserTutorial activeProjectId="tutorial-project" />
      </MemoryRouter>
    );

    const tutorial = screen.getByRole("dialog", { name: "New user tutorial" });
    expect(screen.getByRole("heading", { name: "See the whole project at a glance" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open Board" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/board");
    expect(screen.getByRole("heading", { name: "Move work through its workflow" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/overview");
    expect(tutorial).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Exit tutorial" }));
    expect(screen.queryByRole("dialog", { name: "New user tutorial" })).not.toBeInTheDocument();
  });

  it("follows manual workspace navigation without forcing a route", async () => {
    startNewUserTutorial("tutorial-project");
    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <Link to="/calendar">Open Calendar manually</Link>
        <LocationProbe />
        <NewUserTutorial activeProjectId="tutorial-project" />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("link", { name: "Open Calendar manually" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "See commitments by date" })).toBeInTheDocument();
    });
    expect(screen.getByRole("progressbar", { name: "Tutorial progress" })).toHaveAttribute("aria-valuenow", "6");
  });
});
