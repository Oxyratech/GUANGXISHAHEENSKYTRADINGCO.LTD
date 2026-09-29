import { render, screen } from "@testing-library/react";
import { DirectionProvider } from "./direction";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function SampleTabs() {
  return (
    <Tabs defaultValue="a">
      <TabsList aria-label="Sample">
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel A</TabsContent>
      <TabsContent value="b">Panel B</TabsContent>
    </Tabs>
  );
}

function tabsRoot() {
  return screen.getByRole("tablist").parentElement;
}

afterEach(() => {
  document.documentElement.removeAttribute("dir");
});

describe("direction", () => {
  it("passes the provider's direction to Radix roots", () => {
    render(
      <DirectionProvider dir="rtl">
        <SampleTabs />
      </DirectionProvider>,
    );
    expect(tabsRoot()).toHaveAttribute("dir", "rtl");
  });

  it("falls back to <html dir> when no provider is mounted", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(<SampleTabs />);
    expect(tabsRoot()).toHaveAttribute("dir", "rtl");
  });

  it("prefers the provider over <html dir>", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(
      <DirectionProvider dir="ltr">
        <SampleTabs />
      </DirectionProvider>,
    );
    expect(tabsRoot()).toHaveAttribute("dir", "ltr");
  });
});
