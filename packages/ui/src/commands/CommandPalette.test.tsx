import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { CommandPalette, registerCoreCommands } from "./CommandPalette";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../theme/theme-provider";
import { openPalette, closePalette, isPaletteOpen } from "./palette-bus";

describe("CommandPalette", () => {
  beforeEach(() => {
    closePalette();
  });
  afterEach(() => {
    cleanup();
  });
  it("opens and lists navigation commands when empty", () => {
    registerCoreCommands();
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>
      </ThemeProvider>
    );
    act(() => openPalette());
    expect(isPaletteOpen()).toBe(true);
    expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
  });
  it("filters commands by query", () => {
    registerCoreCommands();
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>
      </ThemeProvider>
    );
    act(() => openPalette());
    const input = screen.getByPlaceholderText(/search commands/i);
    fireEvent.change(input, { target: { value: "bug" } });
    expect(screen.getByText(/create new bug/i)).toBeInTheDocument();
  });

  it("wires the input to an active listbox option for keyboard users", async () => {
    registerCoreCommands();
    render(
      <ThemeProvider>
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>
      </ThemeProvider>
    );
    act(() => openPalette());

    const input = screen.getByRole("combobox", { name: "Search commands, items, docs" });
    const listbox = screen.getByRole("listbox", { name: "Command results" });

    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringMatching(/^command-option-/));

    const firstActiveId = input.getAttribute("aria-activedescendant");
    await userEvent.keyboard("{ArrowDown}");

    expect(input).toHaveFocus();
    expect(input.getAttribute("aria-activedescendant")).not.toBe(firstActiveId);
    expect(document.getElementById(input.getAttribute("aria-activedescendant") ?? "")).toHaveAttribute("aria-selected", "true");
  });
});
