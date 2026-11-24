import { HeadlessLink } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

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
    <Tooltip content="Open customer in Stripe">
      <HeadlessLink
        href={getStripeCustomerURL(stripeCustomerId)}
        target="_blank"
        // The generic external arrow would compete with the logo that already
        // says "this leaves Argos for Stripe".
        external={false}
        aria-label="Open customer in Stripe"
        // The logo carries its own brand color, so hover dims the whole tile
        // rather than re-tinting it the way a monochrome icon would.
        className="shrink-0 opacity-75 transition hover:opacity-100"
      >
        <img src={stripeLogo} alt="" className="size-4 rounded-xs" />
      </HeadlessLink>
    </Tooltip>
  );
}
