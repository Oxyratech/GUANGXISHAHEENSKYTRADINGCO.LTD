import { render, screen } from "@testing-library/react";
import { Checkbox } from "./checkbox";
import { FormField } from "./form-field";
import { Input } from "./input";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Select } from "./select";
import { Textarea } from "./textarea";

function describedBy(element: HTMLElement): string[] {
  return (element.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
}

describe("FormField (stacked)", () => {
  it("associates the label with the control", () => {
    render(
      <FormField label="Email">
        <Input type="email" />
      </FormField>,
    );
    expect(screen.getByLabelText("Email")).toBeInstanceOf(HTMLInputElement);
  });

  it("wires hint and error into aria-describedby and flags the control invalid and required", () => {
    render(
      <FormField label="Email" hint="Use your work address" error="Enter a valid email" required>
        <Input type="email" />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: /Email/ });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");

    const descriptions = describedBy(input).map((id) => document.getElementById(id)?.textContent);
    expect(descriptions).toEqual(["Use your work address", "Enter a valid email"]);
    expect(input).toHaveAccessibleDescription("Use your work address Enter a valid email");
  });

  it("hides the required asterisk from assistive tech", () => {
    render(
      <FormField label="Name" required>
        <Input />
      </FormField>,
    );
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("sets no invalid/required/description attributes on a plain field", () => {
    render(
      <FormField label="Company">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Company");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-required");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("keeps a persistent polite live region so an error that appears is announced", () => {
    const { rerender } = render(
      <FormField label="Email">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    const region = document.querySelector("[aria-live='polite']");
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();

    rerender(
      <FormField label="Email" error="Required">
        <Input />
      </FormField>,
    );
    // Same node, new content: that is what screen readers announce.
    expect(document.querySelector("[aria-live='polite']")).toBe(region);
    expect(region).toHaveTextContent("Required");
    expect(describedBy(input)).toContain(region?.id);

    rerender(
      <FormField label="Email">
        <Input />
      </FormField>,
    );
    expect(region).toBeEmptyDOMElement();
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("preserves a describedby already on the control", () => {
    render(
      <>
        <p id="extra">Extra help</p>
        <FormField label="Notes" hint="Optional">
          <Textarea aria-describedby="extra" />
        </FormField>
      </>,
    );
    expect(screen.getByLabelText("Notes")).toHaveAccessibleDescription("Optional Extra help");
  });

  it("supports a render function and an explicit id", () => {
    render(
      <FormField label="Country" id="country-field">
        {(control) => (
          <Select {...control}>
            <option value="">Select</option>
          </Select>
        )}
      </FormField>,
    );
    expect(screen.getByLabelText("Country")).toHaveAttribute("id", "country-field");
  });

  it("gives every field its own ids", () => {
    render(
      <>
        <FormField label="First" hint="a">
          <Input />
        </FormField>
        <FormField label="Second" hint="b">
          <Input />
        </FormField>
      </>,
    );
    expect(screen.getByLabelText("First").id).not.toBe(screen.getByLabelText("Second").id);
  });
});

describe("FormField (inline)", () => {
  it("labels a checkbox and reports its error", () => {
    render(
      <FormField
        layout="inline"
        label="I agree to the privacy policy"
        error="You must agree"
        required
      >
        <Checkbox />
      </FormField>,
    );
    const checkbox = screen.getByRole("checkbox", { name: /I agree to the privacy policy/ });
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAttribute("aria-required", "true");
    expect(checkbox).toHaveAccessibleDescription("You must agree");
  });
});

describe("FormField (group)", () => {
  it("renders a fieldset named by its legend and described by hint and error", () => {
    render(
      <FormField
        layout="group"
        label="Preferred contact"
        hint="Pick one"
        error="Choose an option"
        required
      >
        <RadioGroup>
          <RadioGroupItem value="email" label="Email" />
          <RadioGroupItem value="phone" label="Phone" />
        </RadioGroup>
      </FormField>,
    );
    const group = screen.getByRole("group", { name: /Preferred contact/ });
    expect(group).toHaveAccessibleDescription("Pick one Choose an option");

    const radioGroup = screen.getByRole("radiogroup");
    expect(radioGroup).toHaveAttribute("aria-invalid", "true");
    expect(radioGroup).toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("radio", { name: "Email" })).toBeInTheDocument();
  });
});
