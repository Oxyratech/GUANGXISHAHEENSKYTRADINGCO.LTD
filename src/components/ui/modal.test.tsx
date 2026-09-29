import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./modal";

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  return render(
    <Modal
      trigger={<button type="button">Open dialog</button>}
      title="Confirm request"
      description="Check the details before sending."
      closeLabel="Close dialog"
      footer={<button type="button">Send</button>}
      {...props}
    >
      <label>
        Note <input />
      </label>
    </Modal>,
  );
}

describe("Modal", () => {
  it("opens as a named, described dialog and moves focus inside it", async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const dialog = screen.getByRole("dialog", { name: "Confirm request" });
    expect(dialog).toHaveAccessibleDescription("Check the details before sending.");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderModal();
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes with the labelled close button", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("traps Tab inside the dialog", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = screen.getByRole("dialog");

    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("works controlled and reports changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderModal({ trigger: undefined, open: true, onOpenChange });

    expect(screen.getByRole("dialog", { name: "Confirm request" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("can keep the title screen-reader only without losing the dialog name", async () => {
    const user = userEvent.setup();
    renderModal({ hideTitle: true, hideDescription: true });
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog", { name: "Confirm request" })).toBeInTheDocument();
    expect(screen.getByText("Confirm request")).toHaveClass("sr-only");
  });
});
