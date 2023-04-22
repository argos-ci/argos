import { FragmentType, graphql, useFragment } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";

const TeamFragment = graphql(`
  fragment TeamMembers_Team on Team {
    id
  }
`);

export const TeamMembers = (props: {
  team: FragmentType<typeof TeamFragment>;
}) => {
  const team = useFragment(TeamFragment, props.team);
  console.log(team);
  return (
    <Card>
      <form>
        <CardBody>
          <CardTitle>Members</CardTitle>
          <CardParagraph>
            Add members to your team to give them access to your projects.
          </CardParagraph>
          <Card>
            <CardBody>
              <CardTitle>Invite a member</CardTitle>
            </CardBody>
          </Card>
        </CardBody>
        <CardFooter className="flex items-center justify-end gap-4">
          <Button type="submit">Save</Button>
        </CardFooter>
      </form>
    </Card>
  );
};
