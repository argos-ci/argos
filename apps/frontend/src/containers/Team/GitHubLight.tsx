import { MarkGithubIcon } from "@primer/octicons-react";

import { DocumentType, graphql } from "@/gql";
import { LinkButton } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Link } from "@/ui/Link";

import { getGitHubAppInstallURL } from "../GitHub";
import { AccountLink } from "../GithubAccountLink";

const _TeamFragment = graphql(`
  fragment TeamGitHubLight_Team on Team {
    id
    githubLightInstallation {
      id
      ghAccount {
        id
        login
        name
        url
      }
    }
  }
`);

export function TeamGitHubLight(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const installURL = getGitHubAppInstallURL("light", { accountId: team.id });

  return (
    <Card>
      <CardBody>
        <CardTitle id="github-without-content-access">
          GitHub without content access
        </CardTitle>
        <CardParagraph>
          Setup a GitHub app without content read permissions to use Argos
          without giving access to your code.
        </CardParagraph>
        {team.githubLightInstallation && (
          <div>
            <div className="flex items-center gap-2 rounded-sm border p-4">
              <MarkGithubIcon className="size-6 shrink-0" />
              <div className="flex-1 font-semibold">
                {team.githubLightInstallation.ghAccount ? (
                  <AccountLink
                    login={team.githubLightInstallation.ghAccount.login}
                    name={team.githubLightInstallation.ghAccount.name}
                    url={team.githubLightInstallation.ghAccount.url}
                  />
                ) : (
                  "Unknown"
                )}
              </div>
            </div>
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <p>
          Learn more about{" "}
          <Link
            href="https://argos-ci.com/docs/github#github-integration-without-content-permission"
            target="_blank"
          >
            using GitHub without content read permissions
          </Link>
          .
        </p>
        {team.githubLightInstallation ? (
          <LinkButton variant="secondary" href={installURL}>
            Uninstall
          </LinkButton>
        ) : (
          <LinkButton href={installURL}>Install GitHub App</LinkButton>
        )}
      </CardFooter>
    </Card>
  );
}
