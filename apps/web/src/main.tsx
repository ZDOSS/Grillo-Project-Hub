/**
 * Grillo Project Hub — web/PWA shell
 * Copyright (C) 2026 ZDOSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

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
  ThemeProvider,
  useRestoreProjectSession
} from "@gph/ui";
import { WebStorageAdapter } from "./platform/storage/web-storage";
import { useAutoSave } from "./platform/auto-save";
import { registerServiceWorker } from "./platform/pwa/register-sw";
import { resolveWebAppDistribution } from "./distribution";

const root = document.getElementById("root")!;
const appDistribution = resolveWebAppDistribution({
  baseUrl: import.meta.env.BASE_URL,
  configuredDistribution: import.meta.env.VITE_GPH_DISTRIBUTION ?? import.meta.env.VITE_GITHUB_PAGES
});

// Initialize the in-memory+localStorage bridge for browser persistence.
WebStorageAdapter.install();

function App() {
  useRestoreProjectSession();
  useAutoSave();
  return (
    <ThemeProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppShell appMode="web" appDistribution={appDistribution}>
          <Routes>
            <Route path="/" element={<ProjectsListView />} />
            <Route path="/projects" element={<ProjectsListView />} />
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
