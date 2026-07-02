import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, IconButton } from "./Button";

describe("Button primitives", () => {
  it("calls onClick when enabled", async () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick while loading", async () => {
    const onClick = vi.fn();

    render(<Button loading onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole("button", { name: /working/i }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps icon-only controls accessible", () => {
    render(<IconButton aria-label="Close">x</IconButton>);

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
