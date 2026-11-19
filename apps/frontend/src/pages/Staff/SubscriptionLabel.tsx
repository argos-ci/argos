import { CreditCardIcon } from "lucide-react";

import { AccountSubscriptionStatus } from "@/gql/graphql";
import { Tooltip } from "@/ui/Tooltip";

/**
 * `trialing_with_payment_method` spelled out is far wider than the column, and
 * the only part that adds anything over "trialing" is that a card is on file,
 * which a credit card icon says just as well.
 */
export function SubscriptionLabel(props: {
  status: string | null | undefined;
}) {
  const { status } = props;

  if (status === AccountSubscriptionStatus.TrialingWithPaymentMethod) {
    return (
      <span className="whitespace-nowrap">
        trialing
        <Tooltip content="Payment method filled">
          <CreditCardIcon
            className="text-success-low ml-1 inline-block size-4"
            aria-label="Payment method filled"
          />
        </Tooltip>
      </span>
    );
  }

  return <>{status ? status.replaceAll("_", " ") : "none"}</>;
}
