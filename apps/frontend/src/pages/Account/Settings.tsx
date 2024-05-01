import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { AccountChangeName } from "@/containers/Account/ChangeName";
import { AccountChangeSlug } from "@/containers/Account/ChangeSlug";
import { AccountGitLab } from "@/containers/Account/GitLab";
import { Query } from "@/containers/Apollo";
import { useAuthTokenPayload } from "@/containers/Auth";
import { SettingsLayout } from "@/containers/Layout";
import { PlanCard } from "@/containers/PlanCard";
import { TeamAccessRole } from "@/containers/Team/AccessRole";
import { TeamDelete } from "@/containers/Team/Delete";
import { TeamGitHubSSO } from "@/containers/Team/GitHubSSO";
import { TeamMembers } from "@/containers/Team/Members";
import { graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { NotFound } from "@/pages/NotFound";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Heading } from "@/ui/Typography";

import { useAccountContext } from ".";

const AccountQuery = graphql(`
  query AccountSettings_account($slug: String!) {
    account(slug: $slug) {
      id

      ... on Team {
        plan {
          id
          fineGrainedAccessControlIncluded
        }
      }

      ...TeamMembers_Team
      ...TeamDelete_Team
      ...AccountChangeName_Account
      ...AccountChangeSlug_Account
      ...PlanCard_Account
      ...AccountGitLab_Account
      ...TeamGitHubSSO_Team
      ...TeamAccessRole_Team
    }
  }
`);

/** @route */
export function Component() {
  const { accountSlug } = useParams();
  const { permissions } = useAccountContext();
  const authPayload = useAuthTokenPayload();
  const userSlug = authPayload?.account.slug;

  if (!accountSlug) {
    return <NotFound />;
  }

  const hasAdminPermission = permissions.includes(AccountPermission.Admin);

  return (
    <Container className="py-10">
      <Helmet>
        <title>{accountSlug} • Settings</title>
      </Helmet>
      <Heading>
        {userSlug === accountSlug ? "Personal" : "Team"} Settings
      </Heading>
      <Query
        // Prevent persistence between pages
        key={accountSlug}
        fallback={<PageLoader />}
        query={AccountQuery}
        variables={{ slug: accountSlug }}
      >
        {({ account }) => {
          if (!account) {
            return <NotFound />;
          }
          const isTeam = account.__typename === "Team";
          const fineGrainedAccessControlIncluded = Boolean(
            isTeam && account.plan?.fineGrainedAccessControlIncluded,
          );

          return (
            <SettingsLayout>
              {hasAdminPermission &&
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
              {hasAdminPermission && <PlanCard account={account} />}
              {isTeam && <TeamMembers team={account} />}
              {isTeam && hasAdminPermission && <TeamGitHubSSO team={account} />}
              {isTeam &&
                hasAdminPermission &&
                fineGrainedAccessControlIncluded && (
                  <TeamAccessRole team={account} />
                )}
              {hasAdminPermission && <AccountGitLab account={account} />}
              {isTeam && hasAdminPermission && <TeamDelete team={account} />}
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
}
