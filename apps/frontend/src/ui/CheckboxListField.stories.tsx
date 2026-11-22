import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useForm } from "react-hook-form";

import { CheckboxListField } from "./CheckboxListField";
import { Form } from "./Form";
import { StoryTitle } from "./StoryTitle";

const PROJECTS = [
  "web",
  "checkout",
  "storybook",
  "docs",
  "marketing",
  "mobile",
  "admin",
  "design-system",
].map((name) => ({ value: name, label: name }));

function CheckboxListFieldFixture({ error = false }: { error?: boolean }) {
  const form = useForm<{ projects: string[] }>({
    defaultValues: { projects: error ? [] : ["web", "docs"] },
  });
  const { setError } = form;
  useEffect(() => {
    if (error) {
      setError("projects", {
        type: "manual",
        message: "Select at least one project",
      });
    }
  }, [error, setError]);
  return (
    <Form form={form} onSubmit={() => {}}>
      <CheckboxListField
        control={form.control}
        name="projects"
        options={PROJECTS}
      />
    </Form>
  );
}

// The field needs a `useForm` result, which only exists inside a render, so
// the fixture stands in as the story's component.
const meta = {
  title: "UI/CheckboxListField",
  component: CheckboxListFieldFixture,
} satisfies Meta<typeof CheckboxListFieldFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex max-w-sm flex-col">
      <StoryTitle>Some ticked, the list scrolls</StoryTitle>
      <CheckboxListFieldFixture {...args} />
    </div>
  ),
};

export const Invalid: Story = {
  args: { error: true },
  render: (args) => (
    <div className="flex max-w-sm flex-col">
      <StoryTitle>Error</StoryTitle>
      <CheckboxListFieldFixture {...args} />
    </div>
  ),
};
