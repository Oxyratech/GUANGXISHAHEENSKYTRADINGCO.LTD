import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enErrors from "@/messages/en/errors.json";
import arErrors from "@/messages/ar/errors.json";
import { navigation, resetNavigation } from "@/components/site/test-utils";
import LocaleError from "./error";

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/site/test-utils")).navigationMock,
);

beforeEach(() => resetNavigation("/"));

function renderError(
  error: Error & { digest?: string },
  retry = vi.fn(),
  locale: "en" | "ar" = "en",
) {
  navigation.locale = locale;
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ errors: locale === "en" ? enErrors : arErrors }}
    >
      <LocaleError error={error} retry={retry} />
    </NextIntlClientProvider>,
  );
  return retry;
}

describe("LocaleError", () => {
  it("shows a friendly heading and explanation as an alert", () => {
    renderError(new Error("boom"));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred on our side/)).toBeInTheDocument();
  });

  it("offers Try again, which retries the page", async () => {
    const user = userEvent.setup();
    const retry = renderError(new Error("boom"));

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("offers a way back to the home page", () => {
    renderError(new Error("boom"));

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
  });

  it("shows the digest as a reference for support", () => {
    renderError(Object.assign(new Error("boom"), { digest: "1234567890" }));

    expect(screen.getByText("Reference:")).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
  });

  it("shows no reference when there is no digest", () => {
    renderError(new Error("boom"));

    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it("never shows the error message or the stack", () => {
    const error = Object.assign(new Error("password authentication failed for user sa"), {
      digest: "abc",
    });
    error.stack = "Error: password authentication failed\n    at secret (/srv/app/server.js:1:1)";
    renderError(error);

    expect(document.body.textContent).not.toMatch(
      /password authentication|secret|server\.js|Error:/,
    );
  });

  it("speaks Arabic in Arabic", () => {
    renderError(Object.assign(new Error("boom"), { digest: "77" }), vi.fn(), "ar");

    expect(screen.getByRole("heading", { name: "حدث خطأ ما" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حاول مرة أخرى" })).toBeInTheDocument();
    expect(screen.getByText("77").parentElement).toHaveTextContent("الرقم المرجعي: 77");
  });
});
