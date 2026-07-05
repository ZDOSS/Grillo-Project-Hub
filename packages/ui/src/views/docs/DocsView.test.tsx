import { cleanup, render, screen, within } from "@testing-library/react";
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
    cleanup();
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
    expect(screen.getByDisplayValue("Second Doc")).toBeInTheDocument();
  });

  it("creates sections, creates a templated document, and moves it into a section", async () => {
    render(
      <MemoryRouter initialEntries={["/docs"]}>
        <Routes>
          <Route path="/docs" element={<DocsView />} />
          <Route path="/doc/:docId" element={<DocsView />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("New section name"), "Decisions");
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));
    await userEvent.selectOptions(screen.getByLabelText("Document template"), "decision");
    await userEvent.click(screen.getByRole("button", { name: "New document" }));

    expect(screen.getByDisplayValue("Decision Record")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decision" })).toBeInTheDocument();

    const sectionOption = screen.getByRole("option", { name: "Decisions" }) as HTMLOptionElement;
    await userEvent.selectOptions(screen.getByLabelText("Document section"), sectionOption.value);

    const bundle = useProjectStore.getState().bundle!;
    const createdDoc = bundle.core.documents.find((entry) => entry.title === "Decision Record")!;
    const section = bundle.core.folders.find((entry) => entry.name === "Decisions")!;
    expect(createdDoc.folderId).toBe(section.id);
  });

  it("shows linked work backlinks and filters docs inside the docs surface", async () => {
    let bundle = useProjectStore.getState().bundle!;
    bundle = useProjectStore.getState().applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: "bug",
      title: "Login crash"
    }).bundle;
    const item = bundle.core.items.find((entry) => entry.title === "Login crash")!;
    const targetDoc = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "API Notes"
    }).bundle.core.documents.at(-1)!;
    const sourceDoc = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "Crash Investigation",
      body: `Linked work: [[item:${item.id}|Login crash]]\n\nRelated doc: [[doc:${targetDoc.id}|API Notes]]`
    }).bundle.core.documents.at(-1)!;
    useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "Release Checklist"
    });

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

    expect(screen.getByRole("heading", { name: "Linked work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login crash" })).toHaveAttribute("href", `/item/${item.id}`);

    const previewDocLink = document.querySelector(`a[data-route="/doc/${targetDoc.id}"]`) as HTMLAnchorElement | null;
    expect(previewDocLink).not.toBeNull();
    await userEvent.click(previewDocLink!);
    expect(screen.getByRole("heading", { name: "Backlinks" })).toBeInTheDocument();
    const contextRail = screen.getByRole("complementary", { name: "Document context" });
    expect(within(contextRail).getByRole("link", { name: "Crash Investigation" })).toHaveAttribute("href", `/doc/${sourceDoc.id}`);

    const docsSidebar = screen.getByRole("complementary", { name: "Docs" });
    await userEvent.type(within(docsSidebar).getByLabelText("Search docs"), "release");
    expect(within(docsSidebar).getByRole("link", { name: "Release Checklist" })).toBeInTheDocument();
    expect(within(docsSidebar).queryByRole("link", { name: "Crash Investigation" })).not.toBeInTheDocument();
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

  it("keeps unsaved editor text when the same document refreshes underneath it", async () => {
    const bundle = useProjectStore.getState().bundle!;
    const doc = bundle.core.documents[0]!;

    render(
      <MemoryRouter initialEntries={[`/doc/${doc.id}`]}>
        <Routes>
          <Route path="/doc/:docId" element={<DocsView />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const editor = document.querySelector("textarea.textarea") as HTMLTextAreaElement | null;
    expect(editor).not.toBeNull();
    await userEvent.clear(editor);
    await userEvent.type(editor, "Unsaved draft text");

    useProjectStore.getState().applyCommand({
      type: "doc.update",
      projectId: bundle.project.id,
      docId: doc.id,
      patch: { body: "External refresh body" }
    });

    expect(document.querySelector("textarea.textarea")).toHaveValue("Unsaved draft text");
  });

  it("navigates to another document after deleting the current document", async () => {
    const bundle = useProjectStore.getState().bundle!;
    const deleteMe = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "Delete Me"
    }).bundle.core.documents.at(-1)!;
    const keepMe = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "Keep Me"
    }).bundle.core.documents.at(-1)!;

    render(
      <MemoryRouter initialEntries={[`/doc/${deleteMe.id}`]}>
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

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Move to trash" }));

    expect(screen.getAllByTestId("location").at(-1)).toHaveTextContent(`/doc/${keepMe.id}`);
    expect(screen.getByDisplayValue("Keep Me")).toBeInTheDocument();
    expect(screen.queryByText("No documents")).not.toBeInTheDocument();
  });

  it("redirects stale document routes to an active document instead of showing an empty workspace", async () => {
    const bundle = useProjectStore.getState().bundle!;
    const staleDoc = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "Archived Route Target"
    }).bundle.core.documents.at(-1)!;
    useProjectStore.getState().applyCommand({
      type: "doc.update",
      projectId: bundle.project.id,
      docId: staleDoc.id,
      patch: { archived: true }
    });
    const activeDoc = useProjectStore.getState().bundle!.core.documents.find((doc) => !doc.archived)!;

    render(
      <MemoryRouter initialEntries={[`/doc/${staleDoc.id}`]}>
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

    expect(await screen.findByDisplayValue(activeDoc.title)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(`/doc/${activeDoc.id}`);
    expect(screen.queryByText("No documents")).not.toBeInTheDocument();
  });

  it("skips archived documents when picking the post-delete navigation target", async () => {
    const bundle = useProjectStore.getState().bundle!;
    const deleteMe = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "Delete Before Hidden"
    }).bundle.core.documents.at(-1)!;
    const hiddenDoc = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "Hidden Doc"
    }).bundle.core.documents.at(-1)!;
    useProjectStore.getState().applyCommand({
      type: "doc.update",
      projectId: bundle.project.id,
      docId: hiddenDoc.id,
      patch: { archived: true }
    });
    const keepMe = useProjectStore.getState().applyCommand({
      type: "doc.create",
      projectId: bundle.project.id,
      title: "Visible After Hidden"
    }).bundle.core.documents.at(-1)!;

    render(
      <MemoryRouter initialEntries={[`/doc/${deleteMe.id}`]}>
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

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Move to trash" }));

    expect(screen.getAllByTestId("location").at(-1)).toHaveTextContent(`/doc/${keepMe.id}`);
    expect(screen.getByDisplayValue("Visible After Hidden")).toBeInTheDocument();
  });
});
