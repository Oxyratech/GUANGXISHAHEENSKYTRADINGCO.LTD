import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./CopyButton";

const props = {
  value: "91450100MAKG57TE3Y",
  label: "Copy code",
  copiedLabel: "Copied",
  announcement: "Unified Social Credit Code copied to the clipboard",
  failedLabel: "Could not copy. Select the code and copy it manually.",
};

afterEach(() => vi.useRealTimers());

describe("CopyButton", () => {
  it("puts the value on the clipboard and says so on the button and to screen readers", async () => {
    const user = userEvent.setup();
    render(<CopyButton {...props} />);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: "Copy code" }));

    expect(await navigator.clipboard.readText()).toBe(props.value);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(status).toHaveTextContent(props.announcement);
    expect(status).toHaveClass("sr-only");
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    render(<CopyButton {...props} />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Copy code" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(await navigator.clipboard.readText()).toBe(props.value);
    expect(screen.getByRole("status")).toHaveTextContent(props.announcement);
  });

  it("goes back to its first label after a few seconds", async () => {
    userEvent.setup(); // installs the clipboard stand-in
    vi.useFakeTimers();
    render(<CopyButton {...props} />);

    // Testing Library's async helpers wait on real timers, so click synchronously and flush.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("does not pretend when the browser refuses the copy", async () => {
    const user = userEvent.setup();
    render(<CopyButton {...props} />);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));

    await user.click(screen.getByRole("button", { name: "Copy code" }));

    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(props.failedLabel);
    expect(status).not.toHaveClass("sr-only");
  });

  it("copes with a browser that has no clipboard at all", async () => {
    const user = userEvent.setup();
    render(<CopyButton {...props} />);
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as never);

    await user.click(screen.getByRole("button", { name: "Copy code" }));

    expect(screen.getByRole("status")).toHaveTextContent(props.failedLabel);
    vi.restoreAllMocks();
  });
});
