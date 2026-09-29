import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DirectionProvider } from "./direction";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function SampleTabs() {
  return (
    <Tabs defaultValue="one">
      <TabsList aria-label="Sections">
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
        <TabsTrigger value="three">Three</TabsTrigger>
      </TabsList>
      <TabsContent value="one">Panel one</TabsContent>
      <TabsContent value="two">Panel two</TabsContent>
      <TabsContent value="three">Panel three</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("shows the selected panel and wires tab to panel", () => {
    render(<SampleTabs />);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "One" })).toHaveTextContent("Panel one");
    expect(screen.queryByText("Panel two")).not.toBeInTheDocument();
  });

  it("moves with ArrowRight in LTR", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="ltr">
        <SampleTabs />
      </DirectionProvider>,
    );
    await user.click(screen.getByRole("tab", { name: "One" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
  });

  it("mirrors the arrow keys in RTL: ArrowLeft goes to the next tab", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <SampleTabs />
      </DirectionProvider>,
    );
    await user.click(screen.getByRole("tab", { name: "One" }));
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
  });
});
