import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { CheckoutStatusDialog } from "@/containers/CheckoutStatusDialog";
import { ProjectList } from "@/containers/ProjectList";
import { graphql } from "@/gql";
import { AccountPermission, TeamUserLevel } from "@/gql/graphql";
import { Page } from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";

import { NotFound } from "../NotFound";

const AccountQuery = graphql(`
  query AccountProjects_account($slug: String!) {
    account(slug: $slug) {
      id
      slug
      permissions
      ... on Team {
        me {
          id
          level
        }
      }
      projects(first: 100, after: 0) {
        edges {
          id
          ...ProjectList_Project
        }
      }
    }
  }
`);

export function Component() {
  const { accountSlug } = useParams();
  invariant(accountSlug);

  return (
    <Page>
      <Helmet>
        <title>{accountSlug} • Projects</title>
      </Helmet>
      <Suspense fallback={<PageLoader />}>
        <Projects accountSlug={accountSlug} />
      </Suspense>
      <CheckoutStatusDialog />
    </Page>
  );
}

function Projects(props: { accountSlug: string }) {
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: props.accountSlug },
    fetchPolicy: "cache-and-network",
  });

  if (!data.account) {
    return <NotFound />;
  }

  const { account } = data;
  return (
    <ProjectList
      projects={account.projects.edges}
      canCreateProject={account.permissions.includes(AccountPermission.Admin)}
      account={account}
      isContributor={
        account.__typename === "Team" &&
        account.me?.level === TeamUserLevel.Contributor
      }
    />
  );
}
