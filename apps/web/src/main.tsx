import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@gph/ui/theme/global.css";
import {
  AppShell,
  ProjectRouter,
  ProjectsListView,
  OpenProjectView,
  DemoFolderView,
  ThemeProvider
} from "@gph/ui";
import { WebStorageAdapter } from "./platform/storage/web-storage";
import { useAutoSave } from "./platform/auto-save";
import { registerServiceWorker } from "./platform/pwa/register-sw";

const root = document.getElementById("root")!;

// Initialize the in-memory+localStorage bridge for browser persistence.
WebStorageAdapter.install();

function App() {
  useAutoSave();
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell appMode="web">
          <Routes>
            <Route path="/" element={<ProjectsListView />} />
            <Route path="/open" element={<OpenProjectView />} />
            <Route path="/demo" element={<DemoFolderView />} />
            <Route path="/*" element={<ProjectRouter />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}

registerServiceWorker();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
