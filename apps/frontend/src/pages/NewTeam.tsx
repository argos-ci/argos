import { useEffect } from "react";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";

import { AuthGuard } from "@/containers/AuthGuard";
import {
  TeamNewForm,
  useCreateTeamAndRedirect,
} from "@/containers/Team/NewForm";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";

const AutoCreateTeam = ({ name }: { name: string }) => {
  const createTeamAndRedirect = useCreateTeamAndRedirect();
  useEffect(() => {
    createTeamAndRedirect({ name }).catch(() => {
      // If there is an error, redirect to the new team page
      // the user will be able to retry
      window.location.replace(`/teams/new?name=${encodeURIComponent(name)}`);
    });
  }, [name, createTeamAndRedirect]);
  return <PageLoader />;
};

/** @route */
export function Component() {
  const [params] = useSearchParams();
  const name = params.get("name");
  const autoSubmit = params.get("autoSubmit") === "true";

  if (name && autoSubmit) {
    return <AutoCreateTeam name={name} />;
  }

  return (
    <Page>
      <Helmet>
        <title>New Team</title>
      </Helmet>
      <hr className="border-t" />
      <AuthGuard>
        {() => {
          return (
            <PageContainer>
              <PageHeader>
                <PageHeaderContent>
                  <Heading>Create a Team</Heading>
                  <Text slot="headline">
                    Create a team to collaborate on one or several projects.
                  </Text>
                </PageHeaderContent>
              </PageHeader>
              <div className="max-w-2xl">
                <TeamNewForm defaultTeamName={name} />
              </div>
            </PageContainer>
          );
        }}
      </AuthGuard>
    </Page>
  );
}
