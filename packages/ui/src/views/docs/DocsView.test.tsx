import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { buildProjectFromTemplate } from "@gph/core";
import { useProjectStore } from "../../store/project-store";
import { DocsView } from "./DocsView";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("DocsView", () => {
  beforeEach(() => {
    const bundle = buildProjectFromTemplate("software-project", "Docs");
    useProjectStore.setState({
      bundle,
      storageKey: bundle.project.id,
      storagePath: null,
      storageTrust: "browser",
      isDirty: false,
      lastSource: null
    });
  });

  it("navigates between docs without leaving the router context", async () => {
    const first = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: useProjectStore.getState().bundle!.project.id,
      title: "First Doc"
    });
    const second = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: useProjectStore.getState().bundle!.project.id,
      title: "Second Doc"
    });
    const secondId = second.bundle.core.documents.find((doc) => doc.title === "Second Doc")!.id;
    void first;

    render(
      <MemoryRouter initialEntries={["/docs"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <LocationProbe />
                <Routes>
                  <Route path="/docs" element={<DocsView />} />
                  <Route path="/doc/:docId" element={<DocsView />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("link", { name: /second doc/i }));

    expect(screen.getByTestId("location")).toHaveTextContent(`/doc/${secondId}`);
    expect(screen.getByTestId("location").textContent).not.toBe("/docs");
  });

  it("intercepts markdown preview links using a data attribute instead of a CSS class contract", async () => {
    const baseBundle = useProjectStore.getState().bundle!;
    const firstDoc = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: baseBundle.project.id,
      title: "Target Doc"
    }).bundle.core.documents.at(-1)!;
    const sourceDoc = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: baseBundle.project.id,
      title: "Source Doc",
      body: `See [[doc:${firstDoc.id}|Target Doc]]`
    }).bundle.core.documents.at(-1)!;

    render(
      <MemoryRouter initialEntries={[`/doc/${sourceDoc.id}`]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <LocationProbe />
                <Routes>
                  <Route path="/docs" element={<DocsView />} />
                  <Route path="/doc/:docId" element={<DocsView />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const previewLink = document.querySelector(`a[data-route="/doc/${firstDoc.id}"]`) as HTMLAnchorElement | null;
    expect(previewLink).not.toBeNull();
    await userEvent.click(previewLink!);

    expect(screen.getAllByTestId("location").at(-1)).toHaveTextContent(`/doc/${firstDoc.id}`);
  });
});
