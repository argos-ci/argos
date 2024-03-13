import { invariant } from "@argos/util/invariant";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { useQuery } from "@/containers/Apollo";
import {
  CheckoutStatusDialog,
  useCheckoutStatusDialog,
} from "@/containers/CheckoutStatusDialog";
import { ProjectList } from "@/containers/ProjectList";
import { graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";

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

export const AccountProjects = () => {
  const { accountSlug } = useParams();
  const { dialog, checkoutStatus } = useCheckoutStatusDialog();
  invariant(accountSlug);

  const { data } = useQuery(AccountQuery, {
    variables: { slug: accountSlug },
    fetchPolicy: "cache-and-network",
  });

  return (
    <div className="bg-subtle flex-1">
      <Container className="pb-10 pt-4">
        <Helmet>
          <title>{accountSlug} • Projects</title>
        </Helmet>
        {data ? (
          data.account ? (
            <ProjectList
              projects={data.account.projects.edges}
              canCreateProject={data.account.permissions.includes(
                AccountPermission.Admin,
              )}
            />
          ) : (
            <NotFound />
          )
        ) : (
          <PageLoader />
        )}
        <CheckoutStatusDialog dialog={dialog} checkoutStatus={checkoutStatus} />
      </Container>
    </div>
  );
};
