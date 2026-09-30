import { describe, expect, it } from "vitest";
import { restoreFormValues } from "./restore-form-values";

function makeForm(html: string): HTMLFormElement {
  const form = document.createElement("form");
  form.innerHTML = html;
  document.body.append(form);
  return form;
}

const field = <T extends HTMLElement>(form: HTMLFormElement, name: string) =>
  form.elements.namedItem(name) as unknown as T;

describe("restoreFormValues", () => {
  it("puts text back into text inputs and textareas", () => {
    const form = makeForm('<input name="title"><textarea name="body"></textarea>');

    restoreFormValues(form, { title: "Kettle", body: "Line 1\nLine 2" });

    expect(field<HTMLInputElement>(form, "title").value).toBe("Kettle");
    expect(field<HTMLTextAreaElement>(form, "body").value).toBe("Line 1\nLine 2");
  });

  it("selects the submitted option", () => {
    const form = makeForm(
      '<select name="status"><option value="A">A</option><option value="B">B</option></select>',
    );

    restoreFormValues(form, { status: "B" });

    expect(field<HTMLSelectElement>(form, "status").value).toBe("B");
  });

  it("restores a multi-select from an array", () => {
    const form = makeForm(
      '<select name="tags" multiple><option value="a">a</option><option value="b">b</option><option value="c">c</option></select>',
    );

    restoreFormValues(form, { tags: ["a", "c"] });

    const selected = [...field<HTMLSelectElement>(form, "tags").selectedOptions].map(
      (o) => o.value,
    );
    expect(selected).toEqual(["a", "c"]);
  });

  it("checks a checkbox exactly when its value was submitted, and unchecks the rest", () => {
    const form = makeForm(
      '<input type="checkbox" name="featured" checked><input type="checkbox" name="tag" value="a"><input type="checkbox" name="tag" value="b" checked>',
    );

    restoreFormValues(form, { tag: ["a"], title: "x" });

    expect(field<HTMLInputElement>(form, "featured").checked).toBe(false);
    const tags = [...form.querySelectorAll<HTMLInputElement>('input[name="tag"]')];
    expect(tags.map((tag) => tag.checked)).toEqual([true, false]);
  });

  it("selects the submitted radio", () => {
    const form = makeForm(
      '<input type="radio" name="kind" value="x" checked><input type="radio" name="kind" value="y">',
    );

    restoreFormValues(form, { kind: "y" });

    const radios = [...form.querySelectorAll<HTMLInputElement>('input[name="kind"]')];
    expect(radios.map((radio) => radio.checked)).toEqual([false, true]);
  });

  it("never touches passwords, files or hidden fields", () => {
    const form = makeForm(
      '<input type="password" name="password"><input type="hidden" name="version" value="4"><input type="file" name="file">',
    );

    restoreFormValues(form, { password: "leaked", version: "999", file: "C:\\x" });

    expect(field<HTMLInputElement>(form, "password").value).toBe("");
    expect(field<HTMLInputElement>(form, "version").value).toBe("4");
  });

  it("leaves text fields the server did not mention as they are", () => {
    const form = makeForm('<input name="a" value="keep"><input name="b">');

    restoreFormValues(form, { b: "set" });

    expect(field<HTMLInputElement>(form, "a").value).toBe("keep");
  });

  it("does nothing without a form or without values", () => {
    const form = makeForm('<input name="a" value="keep">');

    expect(() => restoreFormValues(null, { a: "x" })).not.toThrow();
    restoreFormValues(form, undefined);
    expect(field<HTMLInputElement>(form, "a").value).toBe("keep");
  });

  it("ignores controls without a name", () => {
    const form = makeForm('<input value="keep"><button type="submit">Go</button>');

    expect(() => restoreFormValues(form, { "": "x" })).not.toThrow();
  });
});
