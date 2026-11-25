import { BrandShield } from "@/ui/BrandShield";
import { HeadlessLink } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

import { getAccountURL } from "../Account/AccountParams";
import stripeLogo from "./stripe.svg";

/**
 * The customer page in the Stripe dashboard, where the trial, the card and the
 * invoices actually live — the questions the staff tables raise are answered
 * there.
 */
function getStripeCustomerURL(stripeCustomerId: string) {
  return `https://dashboard.stripe.com/customers/${stripeCustomerId}`;
}

/**
 * Jumps straight to the customer in Stripe.
 *
 * Nothing is rendered without a customer id: a team that never reached checkout
 * has no Stripe page, and a link to `/customers/null` would only look broken.
 */
export function StripeCustomerLink(props: { stripeCustomerId: string | null }) {
  const { stripeCustomerId } = props;

  if (!stripeCustomerId) {
    return null;
  }

  return (
    <ToolTileLink
      href={getStripeCustomerURL(stripeCustomerId)}
      target="_blank"
      label="Open customer in Stripe"
    >
      <img src={stripeLogo} alt="" className="size-4 rounded-xs" />
    </ToolTileLink>
  );
}

export function ArgosTeamLink(props: { teamSlug: string }) {
  return (
    <ToolTileLink
      href={getAccountURL({ accountSlug: props.teamSlug })}
      label="Open team in Argos"
    >
      {/* A filled square like Stripe's, so the two logos read as one pair. The
          violet is fixed rather than a theme token, as Stripe's brand color
          is: the eye's dark pupil would vanish on the dark-mode violets. */}
      <span className="flex size-4 items-center justify-center rounded-xs bg-[#ebe4ff]">
        <BrandShield className="w-3" />
      </span>
    </ToolTileLink>
  );
}

/** A tool's 16px square logo, linking to the team in that tool. */
function ToolTileLink(props: {
  href: string;
  target?: "_blank";
  label: string;
  children: React.ReactNode;
}) {
  const { href, target, label, children } = props;

  return (
    <Tooltip content={label}>
      <HeadlessLink
        href={href}
        target={target}
        // The generic external arrow would compete with the logo that already
        // says which tool the link leaves for.
        external={false}
        aria-label={label}
        // The logo carries its own brand color, so hover dims the whole tile
        // rather than re-tinting it the way a monochrome icon would.
        className="shrink-0 opacity-75 transition hover:opacity-100"
      >
        {children}
      </HeadlessLink>
    </Tooltip>
  );
}
