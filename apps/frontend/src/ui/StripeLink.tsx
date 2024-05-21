import * as React from "react";

import config from "@/config";
import { useAssertAuthToken } from "@/containers/Auth";

import { Button, ButtonProps } from "./Button";
import { Link } from "./Link";
import { useEventCallback } from "./useEventCallback";

async function getStripePortalLink({
  token,
  stripeCustomerId,
  accountId,
}: {
  token: string;
  stripeCustomerId: string;
  accountId: string;
}) {
  const response = await fetch(
    config.get("api.baseUrl") + "/stripe/create-customer-portal-session",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stripeCustomerId, accountId }),
    },
  );
  const json = await response.json();
  return json;
}
const useRedirectToStripePortal = () => {
  const token = useAssertAuthToken();
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">(
    "idle",
  );
  const redirect = useEventCallback(
    (props: { stripeCustomerId: string; accountId: string }) => {
      setStatus("loading");
      getStripePortalLink({
        token,
        stripeCustomerId: props.stripeCustomerId,
        accountId: props.accountId,
      })
        .then((result) => {
          window.location.href = result.sessionUrl;
        })
        .catch((e) => {
          console.error(e);
          setStatus("error");
        });
    },
  );
  return { status, redirect };
};

export function StripePortalLink({
  stripeCustomerId,
  accountId,
  asButton,
  children,
}: {
  stripeCustomerId: string;
  accountId: string;
  asButton?: boolean;
  children: React.ReactNode;
}) {
  const { redirect, status } = useRedirectToStripePortal();

  const disabled = status === "loading";

  const handlePress = () => {
    redirect({ stripeCustomerId, accountId });
  };

  return asButton ? (
    <Button
      isDisabled={disabled}
      onPress={handlePress}
      className="!cursor-pointer"
    >
      {children}
    </Button>
  ) : (
    <Link
      isDisabled={disabled}
      className="inline-flex cursor-pointer items-center"
      onPress={handlePress}
      external
    >
      {children}
    </Link>
  );
}

async function getCheckoutSessionLink({
  token,
  ...props
}: {
  accountId: string;
  token: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const response = await fetch(
    config.get("api.baseUrl") + "/stripe/create-checkout-session",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(props),
    },
  );
  const json = await response.json();
  return json;
}

const useRedirectToStripeCheckout = () => {
  const token = useAssertAuthToken();
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">(
    "idle",
  );
  const redirect = useEventCallback(
    (props: { accountId: string; successUrl: string; cancelUrl: string }) => {
      setStatus("loading");
      getCheckoutSessionLink({
        token,
        accountId: props.accountId,
        successUrl: props.successUrl,
        cancelUrl: props.cancelUrl,
      })
        .then((result) => {
          window.location.href = result.sessionUrl;
        })
        .catch((e) => {
          console.error(e);
          setStatus("error");
        });
    },
  );
  return { status, redirect };
};

export function StripeCheckoutButton({
  isDisabled,
  accountId,
  successUrl,
  cancelUrl,
  ...props
}: ButtonProps & {
  accountId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { redirect, status } = useRedirectToStripeCheckout();

  return (
    <Button
      type="button"
      onPress={() => {
        redirect({
          accountId,
          successUrl,
          cancelUrl,
        });
      }}
      isDisabled={isDisabled || status === "loading"}
      {...props}
    />
  );
}
