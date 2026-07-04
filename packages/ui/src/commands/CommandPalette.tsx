import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/project-store";
import { searchCommands, listCommands, registerCommand, type CommandEntry } from "./registry";
import { closePalette, openCreateItem, subscribePalette, isPaletteOpen } from "./palette-bus";
import { searchProject } from "@gph/core";

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(isPaletteOpen());
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bundle = useProjectStore((s) => s.bundle);

  useEffect(() => subscribePalette(setOpen), []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const allCommands = useMemo(() => {
    const registered = listCommands();
    if (!query.trim()) {
      return registered.filter((c) => c.group === "navigation" || c.group === "view" || c.group === "item");
    }
    return searchCommands(query);
  }, [query]);

  const items: Array<{ id: string; title: string; meta?: string; run: () => void; group: string }> = useMemo(() => {
    const out: Array<{ id: string; title: string; meta?: string; run: () => void; group: string }> = [];
    for (const cmd of allCommands) {
      out.push({
        id: cmd.id,
        title: cmd.title,
        meta: cmd.description,
        run: () => cmd.run({ navigate, openPalette: true, closePalette, openCreateItem }),
        group: cmd.group
      });
    }
    if (bundle && query.trim()) {
      const hits = searchProject(bundle, query, { limit: 8 });
      for (const h of hits) {
        out.push({
          id: `hit-${h.type}-${h.id}`,
          title: h.title,
          meta: `Search hit · ${h.type}`,
          run: () => {
            closePalette();
            if (h.type === "item") navigate(`/item/${h.id}`);
            else if (h.type === "doc") navigate(`/doc/${h.id}`);
            else if (h.type === "comment" && "itemId" in h) navigate(`/item/${h.itemId}`);
            else if (h.type === "label") navigate(`/search?q=${encodeURIComponent(query)}`);
          },
          group: "search-hits"
        });
      }
    }
    return out;
  }, [allCommands, bundle, query, navigate]);

  useEffect(() => setHighlight(0), [query]);

  if (!open) return null;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[highlight];
      if (item) item.run();
    }
  };

  return (
    <div className="cmdk-backdrop" onClick={() => closePalette()}>
      <div className="cmdk" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Search commands, items, docs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
        />
        <div className="cmdk-list">
          {items.length === 0 ? (
            <div className="cmdk-empty">No matches</div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                className="cmdk-item"
                role="option"
                aria-selected={idx === highlight}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => item.run()}
              >
                <span>{item.title}</span>
                {item.meta && <span className="cmdk-item-meta">{item.meta}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function registerCoreCommands(): () => void {
  const unsubs: Array<() => void> = [];
  const nav = (path: string) => {
    window.dispatchEvent(new CustomEvent("gph:navigate", { detail: path }));
  };
  const toggleTheme = () => {
    window.dispatchEvent(new CustomEvent("gph:toggle-theme"));
  };

  const commands: Array<Omit<CommandEntry, "run"> & { run: () => void }> = [
    { id: "nav.projects", title: "Go to projects", group: "navigation", run: () => nav("/") },
    { id: "nav.overview", title: "Go to overview", group: "navigation", run: () => nav("/overview") },
    { id: "nav.board", title: "Go to board", group: "navigation", run: () => nav("/board") },
    { id: "nav.backlog", title: "Go to backlog", group: "navigation", run: () => nav("/backlog") },
    { id: "nav.table", title: "Go to table", group: "navigation", run: () => nav("/table") },
    { id: "nav.roadmap", title: "Go to roadmap", group: "navigation", run: () => nav("/roadmap") },
    { id: "nav.docs", title: "Go to docs", group: "navigation", run: () => nav("/docs") },
    { id: "nav.calendar", title: "Go to calendar", group: "navigation", run: () => nav("/calendar") },
    { id: "nav.bugs", title: "Go to bug triage", group: "navigation", run: () => nav("/bugs") },
    { id: "nav.mywork", title: "Go to my work", group: "navigation", run: () => nav("/mywork") },
    { id: "nav.search", title: "Open search", group: "search", run: () => nav("/search") },
    { id: "nav.settings", title: "Open settings", group: "settings", run: () => nav("/settings") },
    { id: "item.create", title: "Create new work item", shortcut: "C", group: "item", run: () => openCreateItem() },
    { id: "item.createTask", title: "Create new task", group: "item", run: () => openCreateItem({ typeId: "task" }) },
    { id: "item.createBug", title: "Create new bug", group: "item", run: () => openCreateItem({ typeId: "bug" }) },
    { id: "view.toggleTheme", title: "Toggle light/dark theme", group: "settings", run: toggleTheme }
  ];

  for (const entry of commands) {
    const wrapped: CommandEntry = {
      id: entry.id,
      title: entry.title,
      group: entry.group,
      description: entry.description,
      shortcut: entry.shortcut,
      run: (ctx) => {
        entry.run();
        void ctx;
      }
    };
    unsubs.push(registerCommand(wrapped));
  }

  return () => unsubs.forEach((u) => u());
}
