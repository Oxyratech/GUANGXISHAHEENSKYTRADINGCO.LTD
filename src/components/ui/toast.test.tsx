import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { installDomPolyfills } from "./test-utils";
import { Toaster, useToast, type ToastOptions } from "./toast";

beforeAll(installDomPolyfills);

function Trigger({ options, label = "Show" }: { options: ToastOptions; label?: string }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(options)}>
      {label}
    </button>
  );
}

function renderToaster(ui: React.ReactNode) {
  return render(
    <Toaster viewportLabel="Notifications" closeLabel="Dismiss">
      {ui}
    </Toaster>,
  );
}

describe("Toaster", () => {
  it("renders a labelled notifications region", () => {
    renderToaster(<p>page</p>);
    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
  });

  it("shows a toast with title and description when useToast().toast is called", async () => {
    const user = userEvent.setup();
    renderToaster(<Trigger options={{ title: "Inquiry sent", description: "We received it." }} />);
    await user.click(screen.getByRole("button", { name: "Show" }));

    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region).toHaveTextContent("Inquiry sent");
    expect(region).toHaveTextContent("We received it.");
  });

  it("closes a toast with its labelled close button", async () => {
    const user = userEvent.setup();
    renderToaster(<Trigger options={{ title: "Saved" }} />);
    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByRole("region", { name: "Notifications" })).toHaveTextContent("Saved");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(screen.getByRole("region", { name: "Notifications" })).not.toHaveTextContent("Saved");
  });

  it("keeps at most three toasts on screen", async () => {
    const user = userEvent.setup();
    renderToaster(<Trigger options={{ title: "Toast" }} />);
    for (let i = 0; i < 5; i += 1) {
      await user.click(screen.getByRole("button", { name: "Show" }));
    }
    expect(screen.getAllByRole("button", { name: "Dismiss" })).toHaveLength(3);
  });

  it("returns an id from toast() and can dismiss it programmatically", async () => {
    function Controls() {
      const { toast, dismiss } = useToast();
      const [id, setId] = useState("");
      return (
        <>
          <button type="button" onClick={() => setId(toast({ title: "Programmatic" }))}>
            Show
          </button>
          <button type="button" onClick={() => dismiss(id)}>
            Dismiss it
          </button>
          <p data-testid="toast-id">{id}</p>
        </>
      );
    }
    const user = userEvent.setup();
    renderToaster(<Controls />);
    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByTestId("toast-id")).toHaveTextContent(/^toast-\d+$/);
    expect(screen.getByRole("region", { name: "Notifications" })).toHaveTextContent("Programmatic");

    await user.click(screen.getByRole("button", { name: "Dismiss it" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(screen.getByRole("region", { name: "Notifications" })).not.toHaveTextContent(
      "Programmatic",
    );
  });

  it("throws a clear error when useToast is used outside <Toaster>", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger options={{ title: "x" }} />)).toThrow(/inside <Toaster>/);
    spy.mockRestore();
  });
});
