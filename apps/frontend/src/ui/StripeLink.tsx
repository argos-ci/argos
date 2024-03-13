import * as React from "react";
import { clsx } from "clsx";
import { ExternalLinkIcon } from "lucide-react";

import { useAssertAuthToken } from "@/containers/Auth";

import { anchorClassNames } from "./Anchor";
import { Button, ButtonProps } from "./Button";
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
    process.env["API_BASE_URL"] + "/stripe/create-customer-portal-session",
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

export const StripePortalLink = ({
  stripeCustomerId,
  accountId,
  asButton,
  children,
}: {
  stripeCustomerId: string;
  accountId: string;
  asButton?: boolean;
  children: React.ReactNode;
}) => {
  const { redirect, status } = useRedirectToStripePortal();

  const disabled = status === "loading";

  const handleClick = useEventCallback(() => {
    redirect({ stripeCustomerId, accountId });
  });

  return asButton ? (
    <Button type="button" disabled={disabled} onClick={handleClick}>
      {children}
    </Button>
  ) : (
    <button
      type="button"
      disabled={disabled}
      className={clsx(anchorClassNames, "inline-flex items-center")}
      onClick={handleClick}
    >
      {children}
      <ExternalLinkIcon className="mb-0.5 ml-1 inline size-[1em]" />
    </button>
  );
};

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
    process.env["API_BASE_URL"] + "/stripe/create-checkout-session",
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

export const StripeCheckoutButton = ({
  disabled,
  accountId,
  successUrl,
  cancelUrl,
  ...props
}: ButtonProps & {
  accountId: string;
  successUrl: string;
  cancelUrl: string;
}) => {
  const { redirect, status } = useRedirectToStripeCheckout();

  return (
    <Button
      type="button"
      onClick={() => {
        redirect({
          accountId,
          successUrl,
          cancelUrl,
        });
      }}
      disabled={disabled || status === "loading"}
      {...props}
    />
  );
};
