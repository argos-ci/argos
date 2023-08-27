import { MarkGithubIcon } from "@primer/octicons-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import config from "@/config";
import { Query } from "@/containers/Apollo";
import { InstallationsSelect } from "@/containers/InstallationsSelect";
import { RepositoryList } from "@/containers/RepositoryList";
import { DocumentType, graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { PageLoader } from "@/ui/PageLoader";
import { GitHubLoginButton } from "../GitHub";

const MeQuery = graphql(`
  query ConnectRepository_me {
    me {
      id
      linkedToGithub
      ghInstallations {
        edges {
          id
          ...InstallationsSelect_GhApiInstallation
        }
        pageInfo {
          totalCount
        }
      }
    }
  }
`);

type Installation = NonNullable<
  DocumentType<typeof MeQuery>["me"]
>["ghInstallations"]["edges"][0];

type InstallationsProps = {
  installations: Installation[];
  onSelectRepository: (repo: {
    name: string;
    owner_login: string;
    id: string;
  }) => void;
  disabled?: boolean;
  connectButtonLabel: string;
};

const Installations = (props: InstallationsProps) => {
  const firstInstallation = props.installations[0];
  if (!firstInstallation) {
    throw new Error("No installations");
  }
  const [value, setValue] = useState<string>(firstInstallation.id);
  return (
    <div
      className="mt-8 flex flex-col gap-4"
      style={{ height: 400, maxWidth: 800 }}
    >
      <InstallationsSelect
        disabled={props.disabled}
        installations={props.installations}
        value={value}
        setValue={setValue}
      />
      <RepositoryList
        installationId={value}
        disabled={props.disabled}
        onSelectRepository={props.onSelectRepository}
        connectButtonLabel={props.connectButtonLabel}
      />
    </div>
  );
};

export type ConnectRepositoryProps = {
  onSelectRepository: InstallationsProps["onSelectRepository"];
  connectButtonLabel: string;
  disabled?: boolean;
};

export const ConnectRepository = (props: ConnectRepositoryProps) => {
  const { pathname } = useLocation();
  return (
    <Query
      fallback={
        <Card className="h-full">
          <PageLoader />
        </Card>
      }
      query={MeQuery}
    >
      {({ me }) => {
        if (!me) return null;

        if (me.ghInstallations.edges.length === 0) {
          const installationUrl = `${config.get(
            "github.appUrl",
          )}/installations/new?state=${encodeURIComponent(pathname)}`;
          return (
            <Card className="flex h-full flex-col items-center justify-center py-4">
              <div className="mb-4 text-low">
                Install GitHub application to import an existing project from a
                Git repository.
              </div>
              {me.linkedToGithub ? (
                <Button color="neutral">
                  {(buttonProps) => (
                    <a href={installationUrl} {...buttonProps}>
                      <ButtonIcon>
                        <MarkGithubIcon />
                      </ButtonIcon>
                      Continue with GitHub
                    </a>
                  )}
                </Button>
              ) : (
                <GitHubLoginButton redirect={installationUrl}>
                  Continue with GitHub
                </GitHubLoginButton>
              )}
            </Card>
          );
        }

        return (
          <Installations
            onSelectRepository={props.onSelectRepository}
            installations={me.ghInstallations.edges}
            disabled={props.disabled}
            connectButtonLabel={props.connectButtonLabel}
          />
        );
      }}
    </Query>
  );
};
