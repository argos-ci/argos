import { SettingsPage } from "@/containers/Layout";
import { DocumentType, graphql } from "@/gql";
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

const _ProjectFragment = graphql(`
  fragment GettingStarted_Project on Project {
    token
  }
`);

export function GettingStarted(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  return (
    <SettingsPage className="mx-auto">
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
          <Pre code={String(project.token)} />
          <CardParagraph className="font-bold">
            This token should be kept secret. Do not expose it publicly.
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
    </SettingsPage>
  );
}
