import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { AccountChangeName } from "@/containers/Account/ChangeName";
import { AccountChangeSlug } from "@/containers/Account/ChangeSlug";
import { AccountVercel } from "@/containers/Account/Vercel";
import { Query } from "@/containers/Apollo";
import { useAuthTokenPayload } from "@/containers/Auth";
import { SettingsLayout } from "@/containers/Layout";
import { PlanCard } from "@/containers/PlanCard";
import { TeamDelete } from "@/containers/Team/Delete";
import { TeamMembers } from "@/containers/Team/Members";
import { graphql } from "@/gql";
import { Permission } from "@/gql/graphql";
import { NotFound } from "@/pages/NotFound";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Heading } from "@/ui/Typography";

import { useAccountContext } from ".";

const AccountQuery = graphql(`
  query AccountSettings_account($slug: String!) {
    account(slug: $slug) {
      id
      permissions

      plan {
        id
        name
      }

      ...TeamMembers_Team
      ...TeamDelete_Team
      ...AccountChangeName_Account
      ...AccountChangeSlug_Account
      ...PlanCard_Account
      ...AccountVercel_Account
    }
  }
`);

export const AccountSettings = () => {
  const { accountSlug } = useParams();
  const { hasWritePermission } = useAccountContext();
  const authPayload = useAuthTokenPayload();
  const userSlug = authPayload?.account.slug;

  if (!accountSlug) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>{accountSlug} • Settings</title>
      </Helmet>
      <Heading>
        {userSlug === accountSlug ? "Personal" : "Team"} Settings
      </Heading>
      <Query
        fallback={<PageLoader />}
        query={AccountQuery}
        variables={{ slug: accountSlug }}
      >
        {({ account }) => {
          if (!account) return <NotFound />;
          const isTeam = account.__typename === "Team";
          const writable = account.permissions.includes(Permission.Write);

          return (
            <SettingsLayout>
              {writable &&
                (() => {
                  switch (account.__typename) {
                    case "User":
                      return (
                        <>
                          <AccountChangeName
                            account={account}
                            title="Your Name"
                            description="Please enter your full name, or a display name you are comfortable with."
                          />
                          <AccountChangeSlug
                            account={account}
                            title="Your Username"
                            description="This is your URL namespace within Argos."
                          />
                        </>
                      );
                    case "Team":
                      return (
                        <>
                          <AccountChangeName
                            account={account}
                            title="Team Name"
                            description="This is your team's visible name within Argos. For example, the
              name of your company or department."
                          />
                          <AccountChangeSlug
                            account={account}
                            title="Team URL"
                            description="This is your team’s URL namespace on Argos. Within it, your team
                    can inspect their projects or configure settings."
                          />
                        </>
                      );
                  }
                  return null;
                })()}
              <AccountVercel account={account} />
              {writable && account.plan && <PlanCard account={account} />}
              {isTeam && <TeamMembers team={account} />}
              {isTeam && <TeamDelete team={account} />}
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
};
