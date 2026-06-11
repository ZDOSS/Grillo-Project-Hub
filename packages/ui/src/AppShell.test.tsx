import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { ThemeProvider } from "./theme/theme-provider";

describe("AppShell", () => {
  it("renders the shared product frame", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/board"]}>
          <AppShell appMode="web">
            <div>content</div>
          </AppShell>
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getByText(/Grillo Project Hub/i)).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /primary navigation/i })).toBeInTheDocument();
  });
});
