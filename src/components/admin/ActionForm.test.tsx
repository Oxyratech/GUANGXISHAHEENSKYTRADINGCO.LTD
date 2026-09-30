import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toast";
import type { AdminActionState, AdminFormAction } from "@/server/admin/action-state";

const mocks = vi.hoisted(() => ({ pathname: "/admin/products/p1", refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh }),
}));

import { ActionField } from "./ActionField";
import { ActionForm } from "./ActionForm";
import { ActionSubmit } from "./ActionSubmit";

type Action = AdminFormAction<{ id: string }>;

function makeAction(...results: AdminActionState<{ id: string }>[]) {
  const action = vi.fn<Action>();
  for (const result of results) action.mockResolvedValueOnce(result);
  return action;
}

function renderForm(
  action: Action,
  extra: Partial<Parameters<typeof ActionForm<{ id: string }>>[0]> = {},
) {
  return render(
    <Toaster viewportLabel="Notifications" closeLabel="Close">
      <ActionForm action={action} {...extra}>
        <ActionField name="title" label="Title" required hint="Shown on the product page.">
          <Input />
        </ActionField>
        <ActionField name="note" label="Note">
          <Input />
        </ActionField>
        <label>
          <input type="checkbox" name="featured" defaultChecked /> Featured
        </label>
        <ActionSubmit pendingLabel="Saving">Save</ActionSubmit>
      </ActionForm>
    </Toaster>,
  );
}

const title = () => screen.getByLabelText(/^Title/);
const note = () => screen.getByLabelText(/^Note/);

beforeEach(() => {
  mocks.pathname = "/admin/products/p1";
  mocks.refresh.mockReset();
});

describe("submitting", () => {
  it("passes the form's fields to the action", async () => {
    const action = makeAction({ status: "success", data: { id: "p1" } });
    const user = userEvent.setup();
    renderForm(action);

    await user.type(title(), "Kettle");
    await user.type(note(), "Stainless");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const [previous, data] = action.mock.calls[0];
    expect(previous).toEqual({ status: "idle" });
    expect(data.get("title")).toBe("Kettle");
    expect(data.get("note")).toBe("Stainless");
    expect(data.get("featured")).toBe("on");
  });

  it("adds the field's name to a control that has none", () => {
    renderForm(makeAction());

    expect(title()).toHaveAttribute("name", "title");
  });

  it("shows nothing before anything has happened", () => {
    renderForm(makeAction());

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows progress and marks the form busy while the action runs", async () => {
    let finish!: (state: AdminActionState<{ id: string }>) => void;
    const action = vi.fn<Action>(() => new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    renderForm(action);

    await user.type(title(), "Kettle");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const button = await screen.findByRole("button", { name: "Saving" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.closest("form")).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(action).toHaveBeenCalledTimes(1);

    finish({ status: "success", data: { id: "p1" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute("aria-busy"),
    );
  });
});

describe("success", () => {
  it("shows a toast and a line of text, and calls onSuccess with the data", async () => {
    const action = makeAction({ status: "success", data: { id: "p1" }, message: "Product saved" });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderForm(action, { onSuccess });

    await user.type(title(), "Kettle");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // One in the toast (announced), one inline (stays after the toast is gone).
    await waitFor(() => expect(screen.getAllByText("Product saved")).toHaveLength(2));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({ id: "p1" });
  });

  it("falls back to the form's own success message, then to 'Saved'", async () => {
    const user = userEvent.setup();

    const first = renderForm(makeAction({ status: "success", data: { id: "p1" } }), {
      successMessage: "Changes stored",
    });
    await user.type(title(), "x");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findAllByText("Changes stored")).length).toBeGreaterThan(0);
    first.unmount();

    renderForm(makeAction({ status: "success", data: { id: "p1" } }));
    await user.type(title(), "x");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findAllByText("Saved")).length).toBeGreaterThan(0);
  });

  it("does not repeat the toast when a parent re-renders with a new callback", async () => {
    const action = makeAction({ status: "success", data: { id: "p1" }, message: "Done once" });
    const onSuccess = vi.fn();

    function Harness() {
      const [count, setCount] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setCount(count + 1)}>
            Rerender {count}
          </button>
          <Toaster viewportLabel="Notifications" closeLabel="Close">
            <ActionForm action={action} onSuccess={(data) => onSuccess(data, count)}>
              <ActionField name="title" label="Title">
                <Input />
              </ActionField>
              <ActionSubmit>Save</ActionSubmit>
            </ActionForm>
          </Toaster>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: /Rerender/ }));
    await user.click(screen.getByRole("button", { name: /Rerender/ }));

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe("validation errors", () => {
  const invalid: AdminActionState<{ id: string }> = {
    status: "error",
    code: "validation",
    message: "Please correct the highlighted fields.",
    fieldErrors: { title: ["Required"] },
    values: { title: "", note: "Stainless", featured: "on" },
  };

  it("shows the summary as an alert", async () => {
    const user = userEvent.setup();
    renderForm(makeAction(invalid));

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please correct the highlighted fields.",
    );
  });

  it("links each field's message to its control and marks the control invalid", async () => {
    const user = userEvent.setup();
    renderForm(makeAction(invalid));

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(title()).toBeInvalid());
    expect(title()).toHaveAccessibleDescription("Shown on the product page. Required");
    expect(note()).toBeValid();
  });

  it("moves focus to the first invalid control", async () => {
    const user = userEvent.setup();
    renderForm(makeAction(invalid));

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(title()).toHaveFocus());
  });

  it("moves focus to the summary when no field is to blame", async () => {
    const user = userEvent.setup();
    renderForm(
      makeAction({ status: "error", code: "rejected", message: "That slug is already in use." }),
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
  });

  it("keeps what the user typed instead of wiping the form", async () => {
    const user = userEvent.setup();
    renderForm(makeAction(invalid));

    await user.type(note(), "Stainless");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("alert");
    await waitFor(() => expect(note()).toHaveValue("Stainless"));
    expect(title()).toHaveValue("");
  });

  it("restores an unchecked checkbox as unchecked", async () => {
    const user = userEvent.setup();
    const action = makeAction({ ...invalid, values: { title: "", note: "" } });
    renderForm(action);

    await user.click(screen.getByLabelText("Featured"));
    expect(screen.getByLabelText("Featured")).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("alert");
    await waitFor(() => expect(screen.getByLabelText("Featured")).not.toBeChecked());
  });

  it("clears the error once the next attempt succeeds", async () => {
    const user = userEvent.setup();
    renderForm(makeAction(invalid, { status: "success", data: { id: "p1" } }));

    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");
    await user.type(title(), "Kettle");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(title()).toBeValid();
  });
});

describe("other failures", () => {
  it("offers to reload after a conflict", async () => {
    const user = userEvent.setup();
    renderForm(
      makeAction({
        status: "error",
        code: "conflict",
        message: "This record was changed by someone else. Reload and try again.",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This record was changed by someone else.");
    await user.click(within(alert).getByRole("button", { name: "Reload this page" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("offers to sign in again, coming back to this page, when the session expired", async () => {
    const user = userEvent.setup();
    renderForm(
      makeAction({
        status: "error",
        code: "unauthenticated",
        message: "Your session has expired. Sign in again to continue.",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    const link = await screen.findByRole("link", { name: "Sign in again" });
    expect(link).toHaveAttribute("href", "/admin/login?next=%2Fadmin%2Fproducts%2Fp1");
  });

  it("shows an unexpected failure's message, which carries its reference", async () => {
    const user = userEvent.setup();
    renderForm(
      makeAction({
        status: "error",
        code: "internal",
        message: "Something went wrong and nothing was saved. Reference: AB12CD34.",
        reference: "AB12CD34",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Reference: AB12CD34");
    expect(screen.queryByRole("link", { name: "Sign in again" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reload this page" })).not.toBeInTheDocument();
  });
});

describe("ActionField outside a form", () => {
  it("renders like a plain field, with no error", () => {
    render(
      <ActionField name="title" label="Title">
        <Input />
      </ActionField>,
    );

    expect(screen.getByLabelText("Title")).toBeValid();
  });
});
