import { useQuery } from "@apollo/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { graphql } from "@/gql";
import { PageLoader } from "@/ui/PageLoader";

import { NotFound } from "./NotFound";

const UserQuery = graphql(`
  query Checkout_success {
    me {
      id
      lastPurchase {
        id
        account {
          id
          slug
        }
      }
    }
  }
`);

export const CheckoutSuccessRedirect = () => {
  const loggedIn = useIsLoggedIn();
  const { data } = useQuery(UserQuery);
  const navigate = useNavigate();
  const accountSlug = data?.me?.lastPurchase?.account.slug;

  useEffect(() => {
    if (data) {
      navigate(accountSlug ? `/${accountSlug}/settings` : "/");
    }
  }, [data, accountSlug, navigate]);

  if (!loggedIn) {
    return <NotFound />;
  }

  return <PageLoader />;
};
