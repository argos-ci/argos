import { useEffect, useEffectEvent, useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { AccountNameSchema } from "@argos/schemas/account";
import { invariant } from "@argos/util/invariant";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router";

import { AuthGuard } from "@/containers/AuthGuard";
import { AutoInviteList } from "@/containers/Team/Join";
import {
  TeamNewForm,
  useCreateTeamAndRedirect,
} from "@/containers/Team/NewForm";
import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
  PageHeaderHeadline,
  StandalonePage,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";
import { Separator } from "@/ui/Separator";
import { getWelcomeURL } from "@/util/welcome";

import { getAccountURL } from "./Account/AccountParams";

const AutoInvitesQuery = graphql(`
  query NewTeam_autoInvites {
    me {
      id
      welcomeCompleted
    }
    autoInvites {
      id
      ...TeamJoin_AutoInvite
    }
  }
`);

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

/**
 * Creates the team, unless colleagues already have one the viewer can join.
 *
 * Signup sends people who picked team projects here, and their email domain
 * may already lead to a team. Creating a second one without a word splits the
 * company across two teams, so the existing ones are offered first.
 */
function JoinOrCreateTeam(props: { name: string }) {
  const { name } = props;
  const { data } = useSuspenseQuery(AutoInvitesQuery);
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating || data.autoInvites.length === 0) {
    return <AutoCreateTeam name={name} />;
  }

  invariant(data.me, "Expected an authenticated user");
  // A signup that creates its team answers the welcome questions after
  // `createTeam`, so one that joins instead has not been asked them yet.
  const { welcomeCompleted } = data.me;

  return (
    <StandalonePage>
      <Helmet>
        <title>Join your team</title>
      </Helmet>
      <div className="flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Heading>Your colleagues are already on Argos</Heading>
          <p className="text-low text-center text-balance">
            Join their team to work on the same projects, or go ahead and create{" "}
            <strong>{name}</strong>.
          </p>
        </div>
        <AutoInviteList
          autoInvites={data.autoInvites}
          getRedirect={(team) => {
            const teamURL = getAccountURL({ accountSlug: team.slug });
            return welcomeCompleted ? teamURL : getWelcomeURL(teamURL);
          }}
        />
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setIsCreating(true)}>
            Create {name}
          </Button>
        </div>
      </div>
    </StandalonePage>
  );
}

export function Component() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");
  const autoSubmit = searchParams.get("autoSubmit") === "true";

  // The name comes straight from the URL, so no form has vetted it. Submitting
  // one the API refuses would only bounce back to this page a round-trip later,
  // so a name that cannot be a team goes to the form instead, prefilled and
  // editable.
  if (name && autoSubmit && AccountNameSchema.safeParse(name).success) {
    return <AuthGuard>{() => <JoinOrCreateTeam name={name} />}</AuthGuard>;
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
                  <PageHeaderHeadline>
                    Create a team to collaborate on one or several projects.
                  </PageHeaderHeadline>
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
