import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import {
  CheckoutStatusDialog,
  useCheckoutStatusDialog,
} from "@/containers/CheckoutStatusDialog";
import { ProjectList } from "@/containers/ProjectList";
import { graphql } from "@/gql";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";

import { NotFound } from "../NotFound";
import { Permission } from "@/gql/graphql";

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

  if (!accountSlug) {
    return null;
  }

  return (
    <div className="flex-1 bg-subtle">
      <Container className="pb-10 pt-4">
        <Helmet>
          <title>{accountSlug} • Projects</title>
        </Helmet>
        <Query
          fallback={<PageLoader />}
          query={AccountQuery}
          variables={{ slug: accountSlug }}
        >
          {({ account }) => {
            if (!account) return <NotFound />;

            return (
              <ProjectList
                projects={account.projects.edges}
                hasWritePermission={account.permissions.includes(
                  Permission.Write,
                )}
              />
            );
          }}
        </Query>
        <CheckoutStatusDialog dialog={dialog} checkoutStatus={checkoutStatus} />
      </Container>
    </div>
  );
};
