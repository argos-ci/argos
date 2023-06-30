import { LinkExternalIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import { useState } from "react";

import { useAuthToken } from "@/containers/Auth";

import { Button, ButtonProps } from "./Button";
import { anchorClassNames } from "./Link";
import { useEventCallback } from "./useEventCallback";

async function getStripePortalLink({
  token,
  ...props
}: {
  stripeCustomerId: string;
  token: string;
}) {
  const response = await fetch("/stripe/create-customer-portal-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(props),
  });
  const json = await response.json();
  return json;
}

export type UseRedirectToStripePortalProps = { stripeCustomerId: string };

export const useRedirectToStripePortal = () => {
  const token = useAuthToken();
  if (!token) {
    throw new Error(`Invalid token`);
  }
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const redirect = useEventCallback((props: UseRedirectToStripePortalProps) => {
    setStatus("loading");
    getStripePortalLink({
      token,
      stripeCustomerId: props.stripeCustomerId,
    })
      .then((result) => {
        window.location.href = result.sessionUrl;
      })
      .catch((e) => {
        console.error(e);
        setStatus("error");
      });
  });
  return { status, redirect };
};

export type StripePortalButtonProps = {
  stripeCustomerId: string;
  asButton?: boolean;
  children: React.ReactNode;
};

export const StripePortalLink = ({
  stripeCustomerId,
  asButton,
  children,
}: StripePortalButtonProps) => {
  const { redirect, status } = useRedirectToStripePortal();

  const disabled = status === "loading";

  const handleClick = useEventCallback(() => {
    redirect({ stripeCustomerId });
  });

  return asButton ? (
    <Button
      type="button"
      variant="outline"
      color="white"
      disabled={disabled}
      onClick={handleClick}
    >
      {children}
    </Button>
  ) : (
    <button
      type="button"
      disabled={disabled}
      className={clsx(anchorClassNames, "flex items-center")}
      onClick={handleClick}
    >
      {children}
      <LinkExternalIcon className="ml-[0.5ex] h-[1em] w-[1em]" />
    </button>
  );
};

async function getCheckoutSessionLink({
  token,
  ...props
}: {
  accountId: string;
  stripeCustomerId: string | null;
  token: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const response = await fetch("/stripe/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(props),
  });
  const json = await response.json();
  return json;
}

export type UseRedirectToStripeCheckoutSessionProps = {
  accountId: string;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId: string | null;
};

export const useRedirectToStripeCheckout = () => {
  const token = useAuthToken();
  if (!token) {
    throw new Error(`Invalid token`);
  }
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const redirect = useEventCallback(
    (props: UseRedirectToStripeCheckoutSessionProps) => {
      setStatus("loading");
      getCheckoutSessionLink({
        token,
        accountId: props.accountId,
        stripeCustomerId: props.stripeCustomerId,
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
    }
  );
  return { status, redirect };
};

export type StripeCheckoutButtonProps = {
  accountId: string;
  stripeCustomerId: string | null;
  successUrl: string;
  cancelUrl: string;
} & ButtonProps;

export const StripeCheckoutButton = ({
  disabled,
  accountId,
  stripeCustomerId,
  successUrl,
  cancelUrl,
  ...props
}: StripeCheckoutButtonProps) => {
  const { redirect, status } = useRedirectToStripeCheckout();

  return (
    <Button
      type="button"
      onClick={() => {
        redirect({
          accountId,
          stripeCustomerId,
          successUrl,
          cancelUrl,
        });
      }}
      disabled={disabled || status === "loading"}
      {...props}
    />
  );
};
