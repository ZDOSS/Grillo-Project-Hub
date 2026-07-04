/**
 * Grillo Project Hub — desktop shell
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
import { DesktopStorageAdapter } from "./platform/storage/desktop-storage";
import { useAutoSave } from "./platform/auto-save";

const root = document.getElementById("root")!;
DesktopStorageAdapter.install();

function App() {
  useRestoreProjectSession();
  useAutoSave();
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell appMode="desktop">
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

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
