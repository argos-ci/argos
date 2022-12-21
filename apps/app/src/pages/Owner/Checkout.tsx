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

import { useOwnerContext } from ".";

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

const CheckoutQuery = graphql(`
  query OwnerCheckout_owner($login: String!) {
    owner(login: $login) {
      id
      clientReferenceId

      purchase {
        id
        source
      }
    }
  }
`);

export const Checkout = () => {
  const { ownerLogin } = useParams();
  const { hasWritePermission } = useOwnerContext();

  if (!ownerLogin) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>{ownerLogin} • Checkout</title>
        <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
      </Helmet>
      <Heading>
        Subscribe to a plan for <span className="font-bold">{ownerLogin}</span>
      </Heading>
      <Query
        fallback={<PageLoader />}
        query={CheckoutQuery}
        variables={{ login: ownerLogin }}
      >
        {({ owner }) => {
          if (!owner) return <NotFound />;
          if (owner.purchase) return <NotFound />;

          return (
            <div className="mb-20">
              <stripe-pricing-table
                pricing-table-id={config.get("stripe.pricingTableId")}
                publishable-key={config.get("stripe.publishableKey")}
                client-reference-id={owner.clientReferenceId}
              ></stripe-pricing-table>
            </div>
          );
        }}
      </Query>
    </Container>
  );
};
