import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Modal } from "./Modal";

function ModalHarness({ closeOnEscape = true }: { closeOnEscape?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open modal</button>
      {open ? (
        <Modal
          closeOnEscape={closeOnEscape}
          onClose={() => setOpen(false)}
          title="Focused modal"
        >
          <button type="button">Inside action</button>
        </Modal>
      ) : null}
    </>
  );
}

describe("Modal", () => {
  afterEach(() => {
    cleanup();
  });

  it("focuses the close control and restores focus after Escape closes it", async () => {
    render(<ModalHarness />);

    const opener = screen.getByRole("button", { name: "Open modal" });
    await userEvent.click(opener);

    expect(screen.getByRole("dialog", { name: "Focused modal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Focused modal" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
