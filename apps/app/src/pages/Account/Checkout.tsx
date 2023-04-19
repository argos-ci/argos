/* eslint-disable @typescript-eslint/no-namespace */
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import config from "@/config";
import { Query } from "@/containers/Apollo";
import { graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Heading } from "@/ui/Typography";

import { useAccountContext } from ".";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "stripe-pricing-table": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

const AccountQuery = graphql(`
  query AccountCheckout_account($slug: String!) {
    account(slug: $slug) {
      id
      stripeClientReferenceId
      purchase {
        id
        source
      }
    }
  }
`);

export const AccountCheckout = () => {
  const { accountSlug } = useParams();
  const { hasWritePermission } = useAccountContext();

  if (!accountSlug) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>{accountSlug} • Checkout</title>
        <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
      </Helmet>
      <Heading>
        Subscribe to a plan for <span className="font-bold">{accountSlug}</span>
      </Heading>
      <Query
        fallback={<PageLoader />}
        query={AccountQuery}
        variables={{ slug: accountSlug }}
      >
        {({ account }) => {
          if (!account) return <NotFound />;
          if (account.purchase) return <NotFound />;

          return (
            <div className="mb-20">
              <stripe-pricing-table
                pricing-table-id={config.get("stripe.pricingTableId")}
                publishable-key={config.get("stripe.publishableKey")}
                client-reference-id={account.stripeClientReferenceId}
              ></stripe-pricing-table>
            </div>
          );
        }}
      </Query>
    </Container>
  );
};
