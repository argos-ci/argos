import { FragmentType, graphql, useFragment } from "@/gql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Link } from "@/ui/Link";
import { Pre } from "@/ui/Pre";

const ProjectFragment = graphql(`
  fragment ProjectToken_Project on Project {
    token
  }
`);

export const ProjectToken = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const project = useFragment(ProjectFragment, props.project);
  return (
    <Card>
      <CardBody>
        <CardTitle>Upload token</CardTitle>
        <CardParagraph>
          Use this <Code>ARGOS_TOKEN</Code> to authenticate your project when
          you send screenshots to Argos.
        </CardParagraph>
        <Pre code={`ARGOS_TOKEN=${project.token}`} />
        <CardParagraph>
          <strong>
            This token should be kept secret. Do not expose it publicly.
          </strong>
        </CardParagraph>
      </CardBody>
      <CardFooter>
        Read{" "}
        <Link href="https://argos-ci.com/docs" target="_blank">
          Argos documentation
        </Link>{" "}
        for more information about installing and using it.
      </CardFooter>
    </Card>
  );
};
