import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroup", () => {
  it("selects with click and moves with arrow keys", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RadioGroup aria-label="Contact" onValueChange={onValueChange}>
        <RadioGroupItem value="email" label="Email" description="We reply within a business day" />
        <RadioGroupItem value="phone" label="Phone" />
      </RadioGroup>,
    );

    await user.click(screen.getByLabelText("Email"));
    expect(onValueChange).toHaveBeenLastCalledWith("email");
    expect(screen.getByRole("radio", { name: "Email" })).toBeChecked();

    // Radix checks the focused radio only while the arrow key is still held down.
    await user.keyboard("{ArrowDown>}");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Phone" })).toBeChecked());
    await user.keyboard("{/ArrowDown}");
  });

  it("describes an option with its description", () => {
    render(
      <RadioGroup aria-label="Contact">
        <RadioGroupItem value="email" label="Email" description="Fastest" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radio", { name: "Email" })).toHaveAccessibleDescription("Fastest");
  });
});
