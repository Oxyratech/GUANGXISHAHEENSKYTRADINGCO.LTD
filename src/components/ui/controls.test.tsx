import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Select } from "./select";
import { Textarea } from "./textarea";

describe("Input", () => {
  it("defaults to a text input, forwards refs and accepts typing", async () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} aria-label="Name" />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(ref.current).toBe(input);
    await userEvent.type(input, "Shaheen");
    expect(input).toHaveValue("Shaheen");
  });

  it("is 44px tall with 16px text and reacts to aria-invalid", () => {
    render(<Input aria-label="Name" aria-invalid />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("h-11", "text-body", "aria-[invalid=true]:border-danger-600");
  });

  it("supports other types", () => {
    render(<Input type="email" aria-label="Email" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("type", "email");
  });
});

describe("Textarea", () => {
  it("renders a multi-line field and forwards refs", async () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<Textarea ref={ref} aria-label="Message" />);
    const field = screen.getByRole("textbox", { name: "Message" });
    expect(ref.current).toBe(field);
    await userEvent.type(field, "Hello");
    expect(field).toHaveValue("Hello");
  });
});

describe("Select", () => {
  it("is a native select whose chevron is decorative", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Select aria-label="Country" defaultValue="">
        <option value="">Choose</option>
        <option value="cn">China</option>
        <option value="ae">United Arab Emirates</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select.tagName).toBe("SELECT");
    await user.selectOptions(select, "ae");
    expect(select).toHaveValue("ae");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps chevron spacing on the inline end for RTL", () => {
    render(
      <Select aria-label="Country">
        <option>One</option>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveClass("ps-3.5", "pe-10");
  });
});

describe("Checkbox", () => {
  it("toggles with the keyboard and reports state", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox aria-label="Agree" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Agree" });
    await user.tab();
    await user.keyboard(" ");
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    await user.keyboard(" ");
    expect(box).not.toBeChecked();
  });

  it("supports the indeterminate state", () => {
    render(<Checkbox aria-label="Some" checked="indeterminate" />);
    expect(screen.getByRole("checkbox", { name: "Some" })).toHaveAttribute("aria-checked", "mixed");
  });

  it("does not toggle when disabled", async () => {
    render(<Checkbox aria-label="Nope" disabled />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
