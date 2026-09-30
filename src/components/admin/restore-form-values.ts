/*
 * React resets a form's uncontrolled fields when its action finishes, failure included, which would
 * wipe a long description because one field was invalid. The action echoes the submitted text back
 * (AdminActionState.values); this puts it into the fields again, after React's reset.
 *
 * Rules: text-like controls get their text back; a checkbox or radio is checked exactly when its
 * value was submitted (an absent one was unchecked); files and passwords are never restored (browsers
 * cannot, and secrets must not travel back); hidden fields keep their server-rendered value.
 * Controls that keep their own state (Radix Checkbox, custom pickers) should be controlled components.
 */

const SKIPPED_INPUT_TYPES = new Set([
  "file",
  "password",
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
]);

type Values = Record<string, string | string[]>;

function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function restoreFormValues(form: HTMLFormElement | null, values: Values | undefined): void {
  if (!form || !values) return;

  for (const element of Array.from(form.elements)) {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      ) ||
      !element.name
    ) {
      continue;
    }

    const submitted = asList(values[element.name]);
    const present = element.name in values;

    if (element instanceof HTMLInputElement) {
      if (SKIPPED_INPUT_TYPES.has(element.type)) continue;
      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = submitted.includes(element.value);
      } else if (present) {
        element.value = submitted[0] ?? "";
      }
    } else if (element instanceof HTMLSelectElement) {
      if (!present) continue;
      for (const option of Array.from(element.options)) {
        option.selected = submitted.includes(option.value);
      }
    } else if (present) {
      element.value = submitted[0] ?? "";
    }
  }
}
