import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Surface } from "./Surface";

describe("Surface", () => {
  it("renders a named section surface by default", () => {
    render(<Surface aria-label="Workspace card">Recent projects</Surface>);

    const surface = screen.getByRole("region", { name: "Workspace card" });
    expect(surface).toHaveClass(
      "gph-surface",
      "gph-surface-default",
      "gph-surface-padding-md"
    );
    expect(surface).toHaveTextContent("Recent projects");
  });

  it("supports alternate elements, variants, padding, and interactive state", () => {
    render(
      <Surface as="article" variant="elevated" padding="lg" interactive>
        Browser-local project
      </Surface>
    );

    const surface = screen.getByRole("article");
    expect(surface).toHaveClass(
      "gph-surface",
      "gph-surface-elevated",
      "gph-surface-padding-lg",
      "gph-surface-interactive"
    );
  });
});
