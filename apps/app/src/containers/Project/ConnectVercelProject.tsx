import { useQuery } from "@apollo/client";

import config from "@/config";
import { graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { PageLoader } from "@/ui/PageLoader";
import { VercelLogo } from "@/ui/VercelLogo";

import { VercelProjectList } from "../VercelProjectList";

const AccountQuery = graphql(`
  query ConnectVercelProject_account($accountId: ID!) {
    account: accountById(id: $accountId) {
      id
      vercelConfiguration {
        id
        url
        apiProjects {
          projects {
            id
            ...VercelProjectList_VercelApiProject
          }
        }
      }
    }
  }
`);

export type ConnectVercelProjectProps = {
  accountId: string;
  onSelectProject: (input: {
    configuration: { id: string; url: string };
    vercelProjectId: string;
  }) => void;
  disabled: boolean;
};

export const ConnectVercelProject = (props: ConnectVercelProjectProps) => {
  const { data, loading } = useQuery(AccountQuery, {
    variables: { accountId: props.accountId },
  });

  if (loading || !data) {
    return (
      <Card className="h-full">
        <PageLoader />
      </Card>
    );
  }

  const { account } = data;

  if (!account) return null;
  if (account.__typename !== "Team") {
    throw new Error("Account is not a team");
  }

  const configuration = account.vercelConfiguration;

  if (!configuration?.apiProjects) {
    return (
      <Card className="flex h-full flex-col items-center justify-center py-4">
        <div className="mb-4 text-low">
          Setup Vercel integration to continue.
        </div>
        <Button color="neutral">
          {(buttonProps) => (
            <a
              href={config.get("vercel.integrationUrl")}
              target="_blank"
              rel="noopener noreferrer"
              {...buttonProps}
            >
              <ButtonIcon>
                <VercelLogo />
              </ButtonIcon>
              Vercel Marketplace
            </a>
          )}
        </Button>
      </Card>
    );
  }

  return (
    <VercelProjectList
      projects={configuration.apiProjects.projects}
      onSelectProject={(vercelProjectId) => {
        props.onSelectProject({
          configuration,
          vercelProjectId,
        });
      }}
      disabled={props.disabled}
    />
  );
};
