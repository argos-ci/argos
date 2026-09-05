import { useEffect, useEffectEvent } from "react";
import { AccountNameSchema } from "@argos/schemas/account";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router";

import { AuthGuard } from "@/containers/AuthGuard";
import {
  TeamNewForm,
  useCreateTeamAndRedirect,
} from "@/containers/Team/NewForm";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";
import { Separator } from "@/ui/Separator";
import { Text } from "@/ui/Text";

const AutoCreateTeam = ({ name }: { name: string }) => {
  const createTeamAndRedirect = useCreateTeamAndRedirect();
  const createTeamAndRedirectEvent = useEffectEvent(createTeamAndRedirect);
  useEffect(() => {
    createTeamAndRedirectEvent({ name }).catch(() => {
      // If there is an error, redirect to the new team page
      // the user will be able to retry
      window.location.replace(`/teams/new?name=${encodeURIComponent(name)}`);
    });
  }, [name]);
  return <PageLoader />;
};

export function Component() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");
  const autoSubmit = searchParams.get("autoSubmit") === "true";

  // The name comes straight from the URL, so no form has vetted it. Submitting
  // one the API refuses would only bounce back to this page a round-trip later,
  // so a name that cannot be a team goes to the form instead, prefilled and
  // editable.
  if (name && autoSubmit && AccountNameSchema.safeParse(name).success) {
    return <AutoCreateTeam name={name} />;
  }

  return (
    <Page>
      <Helmet>
        <title>New Team</title>
      </Helmet>
      <Separator />
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
