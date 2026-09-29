import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Drawer } from "./drawer";

function renderDrawer(props: Partial<React.ComponentProps<typeof Drawer>> = {}) {
  return render(
    <Drawer
      trigger={<button type="button">Open menu</button>}
      title="Menu"
      description="Site navigation"
      closeLabel="Close menu"
      {...props}
    >
      <a href="#about">About</a>
    </Drawer>,
  );
}

describe("Drawer", () => {
  it("opens as a dialog, closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderDrawer();
    const trigger = screen.getByRole("button", { name: "Open menu" });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog).toHaveAccessibleDescription("Site navigation");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps Tab focus inside", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 4; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("anchors to logical sides so it mirrors in RTL", async () => {
    const user = userEvent.setup();
    const { unmount } = renderDrawer({ side: "start" });
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    let dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-side", "start");
    expect(dialog).toHaveClass("start-0", "border-e");
    expect(dialog.className).not.toMatch(/\b(left|right)-/);
    unmount();

    renderDrawer({ side: "end" });
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("end-0", "border-s");
  });

  it("supports a bottom sheet", async () => {
    const user = userEvent.setup();
    renderDrawer({ side: "bottom" });
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog")).toHaveClass("bottom-0", "inset-x-0");
  });
});
