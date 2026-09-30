import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginState } from "./login-state";

const mocks = vi.hoisted(() => ({ loginAction: vi.fn() }));

vi.mock("./actions", () => ({ loginAction: mocks.loginAction }));

import { LoginForm } from "./LoginForm";

const PASSWORD = "Sup3r-secret-Passw0rd!";

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Email/), "admin@example.com");
  await user.type(screen.getByLabelText(/^Password/), PASSWORD);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  mocks.loginAction.mockReset();
});

describe("LoginForm", () => {
  it("posts the email, the password and the return path to the action", async () => {
    mocks.loginAction.mockResolvedValue({ status: "idle" } satisfies LoginState);
    const user = userEvent.setup();
    render(<LoginForm next="/admin/users" disabled={false} />);

    await fillAndSubmit(user);

    await waitFor(() => expect(mocks.loginAction).toHaveBeenCalledTimes(1));
    const data = mocks.loginAction.mock.calls[0][1] as FormData;
    expect(data.get("email")).toBe("admin@example.com");
    expect(data.get("password")).toBe(PASSWORD);
    expect(data.get("next")).toBe("/admin/users");
  });

  it("shows the server's message as an alert and keeps the email but not the password", async () => {
    mocks.loginAction.mockResolvedValue({
      status: "error",
      code: "invalid_credentials",
      message: "The email or password is incorrect.",
      email: "admin@example.com",
    } satisfies LoginState);
    const user = userEvent.setup();
    render(<LoginForm next="/admin" disabled={false} />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or password is incorrect.",
    );
    expect(screen.getByLabelText(/^Email/)).toHaveValue("admin@example.com");
    expect(screen.getByLabelText(/^Password/)).toHaveValue("");
    expect(document.body.textContent).not.toContain(PASSWORD);
  });

  it("puts the cursor back in the password field after a failed attempt", async () => {
    mocks.loginAction.mockResolvedValue({
      status: "error",
      code: "invalid_credentials",
      message: "The email or password is incorrect.",
      email: "admin@example.com",
    } satisfies LoginState);
    const user = userEvent.setup();
    render(<LoginForm next="/admin" disabled={false} />);

    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByLabelText(/^Password/)).toHaveFocus());
  });

  it("links a missing-field message to its field", async () => {
    mocks.loginAction.mockResolvedValue({
      status: "error",
      code: "invalid_input",
      message: "Enter your email address and password.",
      fieldErrors: { password: "Enter your password." },
      email: "admin@example.com",
    } satisfies LoginState);
    const user = userEvent.setup();
    render(<LoginForm next="/admin" disabled={false} />);

    await user.type(screen.getByLabelText(/^Email/), "admin@example.com");
    await user.type(screen.getByLabelText(/^Password/), "x");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const password = await screen.findByLabelText(/^Password/);
    await waitFor(() => expect(password).toHaveAccessibleDescription("Enter your password."));
    expect(password).toBeInvalid();
  });

  it("shows progress while signing in and ignores a second click", async () => {
    let finish!: (state: LoginState) => void;
    mocks.loginAction.mockReturnValue(new Promise<LoginState>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<LoginForm next="/admin" disabled={false} />);

    await fillAndSubmit(user);

    const button = screen.getByRole("button", { name: "Sign in" });
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
    await user.click(button);
    expect(mocks.loginAction).toHaveBeenCalledTimes(1);

    finish({ status: "idle" });
    await waitFor(() => expect(button).not.toHaveAttribute("aria-busy"));
  });

  it("cannot be submitted when disabled", async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/admin" disabled />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(mocks.loginAction).not.toHaveBeenCalled();
  });
});
