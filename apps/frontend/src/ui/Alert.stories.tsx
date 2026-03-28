import type { Meta, StoryObj } from "@storybook/react-vite";

import { Alert, AlertActions, AlertText, AlertTitle } from "./Alert";
import { Button } from "./Button";

const meta = {
  title: "UI/Alert",
  component: Alert,
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Alert title</AlertTitle>
      <AlertText>Alert content</AlertText>
      <AlertActions>
        <Button variant="secondary">Continue</Button>
      </AlertActions>
    </Alert>
  ),
};
