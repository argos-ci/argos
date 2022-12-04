import { FragmentType, graphql, useFragment } from "@/gql";
import { SettingsLayout } from "@/modern/containers/Layout";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/modern/ui/Card";
import { Code } from "@/modern/ui/Code";
import { Anchor } from "@/modern/ui/Link";
import { Pre } from "@/modern/ui/Pre";

const RepositoryFragment = graphql(`
  fragment GettingStarted_repository on Repository {
    token
  }
`);

export const GettingStarted = (props: {
  repository: FragmentType<typeof RepositoryFragment>;
}) => {
  const repository = useFragment(RepositoryFragment, props.repository);
  return (
    <SettingsLayout className="mx-auto">
      <Card>
        <CardBody>
          <CardTitle>Get started</CardTitle>
          <CardParagraph>
            The repository is ready to receive the first build.
          </CardParagraph>
          <CardParagraph>
            Use this <Code>ARGOS_TOKEN</Code> to authenticate your repository
            when you send screenshots to Argos.
          </CardParagraph>
          <Pre>
            <code>ARGOS_TOKEN={repository.token}</code>
          </Pre>
          <CardParagraph className="font-bold">
            This token should be kept secret. Do not expose it publicly.
          </CardParagraph>
        </CardBody>
        <CardFooter>
          Read{" "}
          <Anchor href="https://docs.argos-ci.com" external>
            Argos documentation
          </Anchor>{" "}
          for more information about installing and using it.
        </CardFooter>
      </Card>
    </SettingsLayout>
  );
};
