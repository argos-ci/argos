import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardSeparator,
  CardTitle,
} from "./Card";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Default</StoryTitle>
      <Card className="max-w-md">
        <CardBody>
          <CardTitle>Card Title</CardTitle>
          <CardParagraph>
            This is a card with body content and a footer.
          </CardParagraph>
        </CardBody>
        <CardFooter>
          <Button variant="primary" size="small">
            Save
          </Button>
        </CardFooter>
      </Card>

      <StoryTitle>Danger</StoryTitle>
      <Card intent="danger" className="max-w-md">
        <CardBody>
          <CardTitle>Danger Zone</CardTitle>
          <CardParagraph>This action cannot be undone.</CardParagraph>
        </CardBody>
        <CardFooter>
          <Button variant="destructive" size="small">
            Delete
          </Button>
        </CardFooter>
      </Card>

      <StoryTitle>With Separator</StoryTitle>
      <Card className="max-w-md">
        <CardBody>
          <CardTitle>Section 1</CardTitle>
          <CardParagraph>First section content.</CardParagraph>
        </CardBody>
        <CardSeparator />
        <CardBody>
          <CardParagraph>Second section content.</CardParagraph>
        </CardBody>
      </Card>
    </div>
  ),
};
