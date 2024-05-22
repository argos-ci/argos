import { useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { CheckoutStatusDialog } from "@/containers/CheckoutStatusDialog";
import { ProjectList } from "@/containers/ProjectList";
import { graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { Container } from "@/ui/Container";

import { NotFound } from "../NotFound";

const AccountQuery = graphql(`
  query AccountProjects_account($slug: String!) {
    account(slug: $slug) {
      id
      permissions
      projects(first: 100, after: 0) {
        edges {
          id
          ...ProjectList_Project
        }
      }
    }
  }
`);

/** @route */
export function Component() {
  const { accountSlug } = useParams();
  invariant(accountSlug);

  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: accountSlug },
    fetchPolicy: "cache-and-network",
  });

  return (
    <div className="bg-subtle flex-1">
      <Container className="pb-10 pt-4">
        <Helmet>
          <title>{accountSlug} • Projects</title>
        </Helmet>
        {data.account ? (
          <ProjectList
            projects={data.account.projects.edges}
            canCreateProject={data.account.permissions.includes(
              AccountPermission.Admin,
            )}
          />
        ) : (
          <NotFound />
        )}
        <CheckoutStatusDialog />
      </Container>
    </div>
  );
}
