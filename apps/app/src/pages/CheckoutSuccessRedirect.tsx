import { useQuery } from "@apollo/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { graphql } from "@/gql";
import { PageLoader } from "@/ui/PageLoader";

import { NotFound } from "./NotFound";

const UserQuery = graphql(`
  query Checkout_success {
    user {
      id
      lastPurchase {
        id
        owner {
          id
          login
        }
      }
    }
  }
`);

export const CheckoutSuccessRedirect = () => {
  const loggedIn = useIsLoggedIn();
  const { data } = useQuery(UserQuery);
  const navigate = useNavigate();
  const ownerLogin = data?.user?.lastPurchase?.owner.login;

  useEffect(() => {
    if (data) {
      navigate(ownerLogin ? `/${ownerLogin}/settings` : "/");
    }
  }, [data, ownerLogin, navigate]);

  if (!loggedIn) {
    return <NotFound />;
  }

  return <PageLoader />;
};
