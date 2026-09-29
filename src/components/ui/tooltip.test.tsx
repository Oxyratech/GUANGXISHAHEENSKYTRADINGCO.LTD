import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./tooltip";
import { installDomPolyfills } from "./test-utils";

beforeAll(installDomPolyfills);

describe("Tooltip", () => {
  it("appears on keyboard focus, describes its trigger and hides on Escape", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Opens the registry page">
        <button type="button">Registry</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab();
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Opens the registry page");
    expect(screen.getByRole("button", { name: "Registry" })).toHaveAccessibleDescription(
      "Opens the registry page",
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
