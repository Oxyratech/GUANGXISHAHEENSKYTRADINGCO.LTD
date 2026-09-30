import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toast";
import type { AdminActionState, AdminFormAction } from "@/server/admin/action-state";
import { ConfirmButton } from "./ConfirmButton";
import { ConfirmDialog } from "./ConfirmDialog";

type Action = AdminFormAction<{ deleted: boolean }>;

function renderButton(
  action: Action,
  props: Partial<Parameters<typeof ConfirmButton<{ deleted: boolean }>>[0]> = {},
) {
  return render(
    <Toaster viewportLabel="Notifications" closeLabel="Close">
      <ConfirmButton
        action={action}
        fields={{ id: "p1", version: "4" }}
        label="Delete product"
        title="Delete this product?"
        description="The product and its images are removed. This cannot be undone."
        confirmLabel="Delete product permanently"
        {...props}
      />
    </Toaster>,
  );
}

const open = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Delete product" }));

describe("ConfirmButton", () => {
  it("does nothing until it is confirmed", async () => {
    const action = vi.fn<Action>();
    const user = userEvent.setup();
    renderButton(action);

    await open(user);

    expect(screen.getByRole("dialog", { name: "Delete this product?" })).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("describes the consequence and names the destructive action explicitly", async () => {
    const user = userEvent.setup();
    renderButton(vi.fn<Action>());

    await open(user);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleDescription(
      "The product and its images are removed. This cannot be undone.",
    );
    expect(
      within(dialog).getByRole("button", { name: "Delete product permanently" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: /^(ok|yes|confirm)$/i }),
    ).not.toBeInTheDocument();
  });

  it("styles the confirm button as destructive by default", async () => {
    const user = userEvent.setup();
    renderButton(vi.fn<Action>());

    await open(user);

    expect(screen.getByRole("button", { name: "Delete product permanently" }).className).toContain(
      "bg-danger-600",
    );
  });

  it("can be a non-destructive confirmation", async () => {
    const user = userEvent.setup();
    renderButton(vi.fn<Action>(), { destructive: false, confirmLabel: "Unpublish" });

    await open(user);

    expect(screen.getByRole("button", { name: "Unpublish" }).className).not.toContain(
      "bg-danger-600",
    );
  });

  it("does not put initial focus on the destructive button", async () => {
    const user = userEvent.setup();
    renderButton(vi.fn<Action>());

    await open(user);

    expect(screen.getByRole("button", { name: "Delete product permanently" })).not.toHaveFocus();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });

  it("cancels without running the action and returns focus to the button", async () => {
    const action = vi.fn<Action>();
    const user = userEvent.setup();
    renderButton(action);

    await open(user);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete product" })).toHaveFocus();
  });

  it("closes with Escape without running the action", async () => {
    const action = vi.fn<Action>();
    const user = userEvent.setup();
    renderButton(action);

    await open(user);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("runs the action with its fields, then closes, toasts and reports success", async () => {
    const action = vi.fn<Action>().mockResolvedValue({
      status: "success",
      data: { deleted: true },
      message: "Product deleted",
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderButton(action, { onSuccess });

    await open(user);
    await user.click(screen.getByRole("button", { name: "Delete product permanently" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const [previous, data] = action.mock.calls[0];
    expect(previous).toBeUndefined();
    expect(data.get("id")).toBe("p1");
    expect(data.get("version")).toBe("4");
    expect(await screen.findByText("Product deleted")).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith({ deleted: true });
  });

  it("uses the default success text when the action returns none", async () => {
    const action = vi
      .fn<Action>()
      .mockResolvedValue({ status: "success", data: { deleted: true } });
    const user = userEvent.setup();
    renderButton(action, { successMessage: "Removed" });

    await open(user);
    await user.click(screen.getByRole("button", { name: "Delete product permanently" }));

    expect(await screen.findByText("Removed")).toBeInTheDocument();
  });

  it("keeps the dialog open with the reason when the action fails, and allows another try", async () => {
    const failure: AdminActionState<{ deleted: boolean }> = {
      status: "error",
      code: "conflict",
      message: "This record was changed by someone else. Reload and try again.",
    };
    const action = vi
      .fn<Action>()
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce({ status: "success", data: { deleted: true } });
    const user = userEvent.setup();
    renderButton(action);

    await open(user);
    await user.click(screen.getByRole("button", { name: "Delete product permanently" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This record was changed by someone else.",
    );

    await user.click(within(dialog).getByRole("button", { name: "Delete product permanently" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("clears an old error when it is opened again", async () => {
    const action = vi.fn<Action>().mockResolvedValue({ status: "error", message: "Nope" });
    const user = userEvent.setup();
    renderButton(action);

    await open(user);
    await user.click(screen.getByRole("button", { name: "Delete product permanently" }));
    await within(await screen.findByRole("dialog")).findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await open(user);

    expect(within(screen.getByRole("dialog")).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports a network failure instead of crashing", async () => {
    const action = vi.fn<Action>().mockRejectedValue(new Error("fetch failed"));
    const user = userEvent.setup();
    renderButton(action);

    await open(user);
    await user.click(screen.getByRole("button", { name: "Delete product permanently" }));

    const alert = await within(await screen.findByRole("dialog")).findByRole("alert");
    expect(alert).toHaveTextContent(/could not be completed/i);
    expect(alert).not.toHaveTextContent("fetch failed");
  });

  it("cannot be dismissed, or confirmed twice, while the action runs", async () => {
    let finish!: (state: AdminActionState<{ deleted: boolean }>) => void;
    const action = vi.fn<Action>(() => new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    renderButton(action);

    await open(user);
    await user.click(screen.getByRole("button", { name: "Delete product permanently" }));

    const confirm = await screen.findByRole("button", { name: "Delete product permanently" });
    await waitFor(() => expect(confirm).toHaveAttribute("aria-busy", "true"));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(confirm);
    expect(action).toHaveBeenCalledTimes(1);

    finish({ status: "success", data: { deleted: true } });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("ConfirmDialog", () => {
  function Harness({ onConfirm }: { onConfirm: () => void }) {
    const [isOpen, setOpen] = useState(true);
    return (
      <ConfirmDialog
        open={isOpen}
        onOpenChange={setOpen}
        title="Archive article?"
        description="It will disappear from the public site."
        confirmLabel="Archive article"
        destructive={false}
        onConfirm={onConfirm}
      >
        <p>Two translations will also be hidden.</p>
      </ConfirmDialog>
    );
  }

  it("calls onConfirm from the confirm button and shows extra content", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness onConfirm={onConfirm} />);

    expect(screen.getByText("Two translations will also be hidden.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive article" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes from its close button", async () => {
    const user = userEvent.setup();
    render(<Harness onConfirm={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
