import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { assertNever } from "@argos/util/assertNever";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { AccountChangeName } from "@/containers/Account/ChangeName";
import { AccountChangeSlug } from "@/containers/Account/ChangeSlug";
import { AccountGitLab } from "@/containers/Account/GitLab";
import { useAuthTokenPayload } from "@/containers/Auth";
import { SettingsLayout } from "@/containers/Layout";
import { PlanCard } from "@/containers/PlanCard";
import { TeamAccessRole } from "@/containers/Team/AccessRole";
import { TeamDelete } from "@/containers/Team/Delete";
import { TeamGitHubLight } from "@/containers/Team/GitHubLight";
import { TeamGitHubSSO } from "@/containers/Team/GitHubSSO";
import { TeamMembers } from "@/containers/Team/Members";
import { TeamSlack } from "@/containers/Team/Slack";
import { TeamSpendManagement } from "@/containers/Team/SpendManagement";
import { UserAuth } from "@/containers/User/Auth";
import { graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { NotFound } from "@/pages/NotFound";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";
import { useScrollToHash } from "@/ui/useScrollToHash";

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

      ...TeamSlack_Account
      ...TeamMembers_Team
      ...TeamDelete_Team
      ...AccountChangeName_Account
      ...AccountChangeSlug_Account
      ...PlanCard_Account
      ...AccountGitLab_Account
      ...TeamGitHubSSO_Team
      ...TeamAccessRole_Team
      ...TeamGitHubLight_Team
      ...UserAuth_Account
      ...TeamSpendManagement_Account
    }
  }
`);

/** @route */
export function Component() {
  const { accountSlug } = useParams();
  const authPayload = useAuthTokenPayload();
  const userSlug = authPayload?.account.slug;

  if (!accountSlug) {
    return <NotFound />;
  }

  const title =
    userSlug === accountSlug ? "Personal Settings" : "Team Settings";

  return (
    <Page>
      <Helmet>
        <title>{`${accountSlug} • ${title}`}</title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>{title}</Heading>
            <Text slot="headline">
              Manage your {userSlug === accountSlug ? "personal" : "team"}{" "}
              settings and preferences.
            </Text>
          </PageHeaderContent>
        </PageHeader>
        <Suspense
          fallback={
            <SettingsLayout>
              <PageLoader />
            </SettingsLayout>
          }
        >
          <PageContent accountSlug={accountSlug} />
        </Suspense>
      </PageContainer>
    </Page>
  );
}

function PageContent(props: { accountSlug: string }) {
  const { permissions } = useAccountContext();
  const {
    data: { account },
  } = useSuspenseQuery(AccountQuery, {
    variables: { slug: props.accountSlug },
  });
  useScrollToHash();

  if (!account) {
    return <NotFound />;
  }

  const hasAdminPermission = permissions.includes(AccountPermission.Admin);
  const isTeam = account.__typename === "Team";
  const isUser = account.__typename === "User";
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
            default:
              assertNever(account);
          }
        })()}
      {isUser && hasAdminPermission && <UserAuth account={account} />}
      {hasAdminPermission && <PlanCard account={account} />}
      {isTeam && <TeamSpendManagement account={account} />}
      {isTeam && <TeamMembers team={account} />}
      {isTeam && hasAdminPermission && <TeamGitHubSSO team={account} />}
      {isTeam && hasAdminPermission && fineGrainedAccessControlIncluded && (
        <TeamAccessRole team={account} />
      )}
      {isTeam && <TeamSlack account={account} />}
      {isTeam && hasAdminPermission && <TeamGitHubLight team={account} />}
      {hasAdminPermission && <AccountGitLab account={account} />}
      {isTeam && hasAdminPermission && <TeamDelete team={account} />}
    </SettingsLayout>
  );
}
