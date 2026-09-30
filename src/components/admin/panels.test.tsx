import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import { AccessDenied } from "./AccessDenied";
import { AdminAccessFailure } from "./AdminAccessFailure";
import { AdminErrorPanel } from "./AdminErrorPanel";
import { AdminNotFound } from "./AdminNotFound";
import { DatabaseUnavailablePanel } from "./DatabaseUnavailablePanel";

beforeEach(() => {
  mocks.refresh.mockReset();
});

describe("AccessDenied", () => {
  it("is a 403 panel with the page's h1, an alert, and a way back", () => {
    render(<AccessDenied />);

    expect(
      screen.getByRole("heading", { level: 1, name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("names the missing permission when it is given", () => {
    render(<AccessDenied permission="inquiry:read" />);

    expect(screen.getByText("inquiry:read").tagName).toBe("CODE");
  });

  it("does not mention a permission when none is given", () => {
    render(<AccessDenied />);

    expect(screen.queryByText(/:read/)).not.toBeInTheDocument();
  });
});

describe("DatabaseUnavailablePanel", () => {
  it("says the database is not configured, and points at the docs, for a missing DATABASE_URL", () => {
    render(<DatabaseUnavailablePanel cause="not_configured" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Database not configured" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This area needs a database connection (DATABASE_URL). See docs/DATABASE.md.",
      ),
    ).toBeInTheDocument();
    // Trying again cannot fix a missing setting.
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("says the database could not be reached, and offers to try again", async () => {
    const user = userEvent.setup();
    render(<DatabaseUnavailablePanel cause="connection" />);

    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/shows real data only/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("says when the database is too slow", () => {
    render(<DatabaseUnavailablePanel cause="timeout" />);

    expect(
      screen.getByRole("heading", { name: "The database took too long to respond" }),
    ).toBeInTheDocument();
  });

  it("treats an unknown cause as a connection problem", () => {
    render(<DatabaseUnavailablePanel />);

    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
  });

  it("can sit under a page title as an h2", () => {
    render(<DatabaseUnavailablePanel cause="connection" titleAs="h2" />);

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("never shows a stack trace or a connection string", () => {
    render(<DatabaseUnavailablePanel cause="connection" />);

    expect(document.body.textContent).not.toMatch(/sqlserver:\/\/|password=|at .*\(.*:\d+:\d+\)/);
  });
});

describe("AdminAccessFailure", () => {
  it("renders the 403 panel for a forbidden result", () => {
    render(
      <AdminAccessFailure access={{ ok: false, reason: "forbidden" }} permission="user:read" />,
    );

    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(screen.getByText("user:read")).toBeInTheDocument();
  });

  it("renders the outage panel, with its cause, for a database result", () => {
    render(
      <AdminAccessFailure
        access={{ ok: false, reason: "database_unavailable", cause: "not_configured" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Database not configured" })).toBeInTheDocument();
  });
});

describe("AdminErrorPanel", () => {
  it("shows a friendly message, a way to retry and a way out", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<AdminErrorPanel error={new Error("boom")} retry={retry} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("shows the digest as a reference", () => {
    render(
      <AdminErrorPanel
        error={Object.assign(new Error("boom"), { digest: "1234567890" })}
        retry={vi.fn()}
      />,
    );

    expect(screen.getByText("Reference:")).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
  });

  it("shows no reference when there is no digest", () => {
    render(<AdminErrorPanel error={new Error("boom")} retry={vi.fn()} />);

    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it("never shows the error message or the stack", () => {
    const error = Object.assign(new Error("Login failed for user 'sa' (password=hunter2)"), {
      digest: "abc",
    });
    error.stack = "Error: Login failed\n    at query (/srv/app/server.js:10:5)";

    render(<AdminErrorPanel error={error} retry={vi.fn()} />);

    expect(document.body.textContent).not.toMatch(/Login failed|hunter2|server\.js|password/);
  });

  it("supplies its own main landmark when it has to stand alone", () => {
    render(<AdminErrorPanel error={new Error("x")} retry={vi.fn()} standalone />);

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { name: "Something went wrong" }),
    );
  });

  it("leaves the landmark to the shell otherwise", () => {
    render(<AdminErrorPanel error={new Error("x")} retry={vi.fn()} />);

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});

describe("AdminNotFound", () => {
  it("says the page does not exist and links back", () => {
    render(<AdminNotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });

  it("stands alone with its own main landmark when asked", () => {
    render(<AdminNotFound standalone />);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
