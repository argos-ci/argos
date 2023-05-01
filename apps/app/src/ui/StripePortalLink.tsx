import { LinkExternalIcon } from "@primer/octicons-react";
import clsx from "clsx";

import { Anchor, anchorClassNames } from "./Link";

export const ContactLink = () => {
  return (
    <>
      Contact Argos support via{" "}
      <Anchor href="https://discord.gg/WjzGrQGS4A" external>
        Discord
      </Anchor>{" "}
      or{" "}
      <Anchor href="mailto:contact@argos-ci.com" external>
        by e-mail
      </Anchor>
      {"  "}to manage your subscription.
    </>
  );
};

export const StripePortalLink = ({
  stripeCustomerId,
  children,
}: {
  stripeCustomerId: string;
  children: React.ReactNode;
}) => {
  return (
    <form
      method="POST"
      action="/stripe/create-customer-portal-session"
      encType="x-www-form-urlencoded"
      className="inline"
    >
      <button
        type="submit"
        className={clsx(anchorClassNames, "inline-flex items-center")}
      >
        {children}
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
