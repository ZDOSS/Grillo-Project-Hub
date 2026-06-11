import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
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
});
