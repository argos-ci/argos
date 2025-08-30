import {
  Children,
  Fragment,
  isValidElement,
  Suspense,
  type ReactNode,
} from "react";
import { useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { Route, Routes } from "react-router-dom";

import { AccountChangeName } from "@/containers/Account/ChangeName";
import { AccountChangeSlug } from "@/containers/Account/ChangeSlug";
import { AccountGitLab } from "@/containers/Account/GitLab";
import { useAuthTokenPayload } from "@/containers/Auth";
import { SettingsLayout, SettingsPage } from "@/containers/Layout";
import { PlanCard } from "@/containers/PlanCard";
import { TeamAccessRole } from "@/containers/Team/AccessRole";
import { TeamDelete } from "@/containers/Team/Delete";
import { TeamGitHubLight } from "@/containers/Team/GitHubLight";
import { TeamGitHubSSO } from "@/containers/Team/GitHubSSO";
import { TeamMembers } from "@/containers/Team/members/Members";
import { TeamSlack } from "@/containers/Team/Slack";
import { TeamSpendManagement } from "@/containers/Team/SpendManagement";
import { UserAuth } from "@/containers/User/Auth";
import { UserDelete } from "@/containers/User/Delete";
import { UserEmails } from "@/containers/User/Emails";
import { graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { NotFound } from "@/pages/NotFound";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Nav, NavLink, NavList, NavListItem } from "@/ui/Nav";
import { PageLoader } from "@/ui/PageLoader";
import { useScrollToHash } from "@/ui/useScrollToHash";

import { useAccountContext } from ".";
import { getAccountURL, useAccountParams } from "./AccountParams";

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
      ...UserDelete_User
      ...UserEmail_Account
    }
  }
`);

/** @route */
export function Component() {
  const params = useAccountParams();
  invariant(params, "Account params required");
  const { accountSlug } = params;

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
            <SettingsPage>
              <PageLoader />
            </SettingsPage>
          }
        >
          <PageContent />
        </Suspense>
      </PageContainer>
    </Page>
  );
}

function PageContent() {
  const params = useAccountParams();
  invariant(params, "Account params required");
  const { accountSlug } = params;
  const { permissions } = useAccountContext();
  const {
    data: { account },
  } = useSuspenseQuery(AccountQuery, {
    variables: { slug: accountSlug },
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
  const settingsUrl = `${getAccountURL(params)}/settings`;

  const routes = [
    {
      name: "General",
      slug: "",
      element: hasAdminPermission ? (
        <>
          {isUser && (
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
          )}
          {isTeam && (
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
          )}
          {isUser && <UserEmails account={account} />}
          {isTeam && hasAdminPermission && <TeamDelete team={account} />}
          {isUser && hasAdminPermission && <UserDelete user={account} />}
        </>
      ) : null,
    },
    {
      name: "Billing",
      slug: "billing",
      element: (
        <>
          {hasAdminPermission && <PlanCard account={account} />}
          {isTeam && <TeamSpendManagement account={account} />}
        </>
      ),
    },
    {
      name: "Authentication",
      slug: "authentication",
      element: isUser && hasAdminPermission && <UserAuth account={account} />,
    },
    {
      name: "Members",
      slug: "members",
      element: (
        <>
          {isTeam && <TeamMembers team={account} />}
          {isTeam && hasAdminPermission && <TeamGitHubSSO team={account} />}
          {isTeam && hasAdminPermission && fineGrainedAccessControlIncluded && (
            <TeamAccessRole team={account} />
          )}
        </>
      ),
    },
    {
      name: "Integrations",
      slug: "integrations",
      element: (
        <>
          {isTeam && <TeamSlack account={account} />}
          {isTeam && hasAdminPermission && <TeamGitHubLight team={account} />}
          {hasAdminPermission && <AccountGitLab account={account} />}
        </>
      ),
    },
  ];

  const matchedRoutes = routes.filter((route) =>
    checkIsNonEmptyElement(route.element),
  );

  return (
    <SettingsLayout>
      <Nav>
        <NavList>
          {matchedRoutes.map((route) => (
            <NavListItem key={route.slug}>
              <NavLink
                to={`${settingsUrl}${route.slug ? `/${route.slug}` : ""}`}
                end
              >
                {route.name}
              </NavLink>
            </NavListItem>
          ))}
        </NavList>
      </Nav>
      <SettingsPage>
        <Routes>
          {matchedRoutes.map((route) => {
            return (
              <Route
                key={route.slug}
                index={!route.slug}
                path={route.slug}
                element={route.element}
              />
            );
          })}
        </Routes>
      </SettingsPage>
    </SettingsLayout>
  );
}

function checkIsNonEmptyElement(element: ReactNode): boolean {
  if (!element) {
    return false;
  }
  if (
    isValidElement<{ children?: ReactNode }>(element) &&
    element.type === Fragment
  ) {
    return Children.toArray(element.props.children).some(
      checkIsNonEmptyElement,
    );
  }
  return true;
}
