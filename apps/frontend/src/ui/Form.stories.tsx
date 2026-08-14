import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useForm } from "react-hook-form";

import { Card, CardBody, CardTitle } from "./Card";
import { Form } from "./Form";
import { FormCardFooter } from "./FormCardFooter";
import { FormCheckbox } from "./FormCheckbox";
import { FormSwitch } from "./FormSwitch";
import { FormTextInput } from "./FormTextInput";
import { StoryTitle } from "./StoryTitle";

type Values = {
  name: string;
  email: string;
  notifications: boolean;
  terms: boolean;
};

const DEFAULT_VALUES: Values = {
  name: "Argos",
  email: "not-an-email",
  notifications: true,
  terms: false,
};

/**
 * The whole form layer in one frame: `FormTextInput`, `FormCheckbox`,
 * `FormSwitch` and `FormCardFooter` (which is itself `FormRootError` +
 * `FormSuccess` + `FormSubmit`). None of these have a baseline today, and the
 * error path is what changes when `FieldErrorContext` gives way to Base UI's
 * `Field.Error`.
 */
function FormFixture({ errors = false }: { errors?: boolean }) {
  const form = useForm<Values>({ defaultValues: DEFAULT_VALUES });
  const { setError } = form;
  useEffect(() => {
    if (!errors) {
      return;
    }
    setError("email", { type: "manual", message: "Enter a valid email." });
    setError("terms", {
      type: "manual",
      message: "You must accept the terms.",
    });
    setError("root.serverError", {
      type: "manual",
      message: "Something went wrong.",
    });
  }, [errors, setError]);
  return (
    <Form form={form} onSubmit={() => {}}>
      <Card>
        <CardBody>
          <CardTitle>Account</CardTitle>
          <div className="flex flex-col gap-4">
            {/* `register` is how call sites bind the value — `name` alone
                leaves the input uncontrolled and empty. */}
            <FormTextInput
              control={form.control}
              {...form.register("name")}
              label="Name"
            />
            <FormTextInput
              control={form.control}
              {...form.register("email")}
              label="Email"
              description="Where we send build notifications."
            />
            <FormSwitch
              control={form.control}
              name="notifications"
              label="Notifications"
            />
            <FormCheckbox
              control={form.control}
              name="terms"
              label="I accept the terms"
            />
          </div>
        </CardBody>
        <FormCardFooter control={form.control} />
      </Card>
    </Form>
  );
}

// The component under test needs a `useForm` result, which only exists inside a
// render, so the fixture stands in for `Form` as the story's component.
const meta = {
  title: "UI/Form",
  component: FormFixture,
} satisfies Meta<typeof FormFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex max-w-lg flex-col">
      <StoryTitle>Fields</StoryTitle>
      <FormFixture {...args} />
    </div>
  ),
};

export const Invalid: Story = {
  args: { errors: true },
  render: (args) => (
    <div className="flex max-w-lg flex-col">
      <StoryTitle>Field and root errors</StoryTitle>
      <FormFixture {...args} />
    </div>
  ),
};
