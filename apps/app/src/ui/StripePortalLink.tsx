import { LinkExternalIcon } from "@primer/octicons-react";

import { anchorClassNames } from "./Link";

export const StripePortalLink = ({
  stripeCustomerId,
}: {
  stripeCustomerId: string;
}) => {
  if (!stripeCustomerId) {
    return null;
  }

  return (
    <form
      method="POST"
      action="/stripe/create-customer-portal-session"
      encType="x-www-form-urlencoded"
      className="inline"
    >
      <button type="submit" className={anchorClassNames}>
        Manage your subscription on Stripe
        <LinkExternalIcon className="ml-[0.5ex] h-[1em] w-[1em]" />
      </button>
      <input
        type="hidden"
        name="stripeCustomerId"
        id="stripeCustomerId"
        value={stripeCustomerId}
      />
    </form>
  );
};
