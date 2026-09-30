import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);

import AdminError from "./error";
import ConsoleError from "./(console)/error";

const failure = Object.assign(new Error("Login failed for user 'sa' (password=hunter2)"), {
  digest: "9f3a1c",
});

describe.each([
  ["the admin error boundary", AdminError, true],
  ["the console error boundary", ConsoleError, false],
])("%s", (_name, Boundary, standalone) => {
  it("shows a friendly message and a reference, never the raw error", () => {
    render(<Boundary error={failure} retry={vi.fn()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(screen.getByText("9f3a1c")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Login failed|hunter2|password/);
  });

  it("offers Try again, which retries the segment", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<Boundary error={failure} retry={retry} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it(`${standalone ? "brings" : "leaves to the shell"} its own main landmark`, () => {
    render(<Boundary error={failure} retry={vi.fn()} />);

    if (standalone) expect(screen.getByRole("main")).toBeInTheDocument();
    else expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});
