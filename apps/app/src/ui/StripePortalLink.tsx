import { LinkExternalIcon } from "@primer/octicons-react";

import config from "@/config";

import { Anchor, anchorClassNames } from "./Link";

export const StripePortalLink = ({
  stripeCustomerId,
}: {
  stripeCustomerId: string | null;
}) => {
  if (!stripeCustomerId) {
    return (
      <>
        Contact Argos support via{" "}
        <Anchor href="https://discord.gg/WjzGrQGS4A" external>
          Discord
        </Anchor>{" "}
        or{" "}
        <Anchor href={`mailto:${config.get("contactEmail")}`} external>
          by e-mail
        </Anchor>
        {"  "}to manage your subscription.
      </>
    );
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
