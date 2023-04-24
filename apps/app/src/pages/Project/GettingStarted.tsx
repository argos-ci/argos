import { SettingsLayout } from "@/containers/Layout";
import { FragmentType, graphql, useFragment } from "@/gql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Anchor } from "@/ui/Link";
import { Pre } from "@/ui/Pre";

const ProjectFragment = graphql(`
  fragment GettingStarted_Project on Project {
    token
  }
`);

export const GettingStarted = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const project = useFragment(ProjectFragment, props.project);
  return (
    <SettingsLayout className="mx-auto">
      <Card>
        <CardBody>
          <CardTitle>Get started</CardTitle>
          <CardParagraph>
            The project is ready to receive the first build.
          </CardParagraph>
          <CardParagraph>
            Use this <Code>ARGOS_TOKEN</Code> to authenticate your project when
            you send screenshots to Argos.
          </CardParagraph>
          <Pre>
            <code>ARGOS_TOKEN={project.token}</code>
          </Pre>
          <CardParagraph className="font-bold">
            This token should be kept secret. Do not expose it publicly.
          </CardParagraph>
        </CardBody>
        <CardFooter>
          Read{" "}
          <Anchor href="https://argos-ci.com/docs" external>
            Argos documentation
          </Anchor>{" "}
          for more information about installing and using it.
        </CardFooter>
      </Card>
    </SettingsLayout>
  );
};
