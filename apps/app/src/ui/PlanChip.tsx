import { PurchaseStatus } from "@/gql/graphql";

import { Chip, ChipColor } from "./Chip";

const getChipProps = ({
  planName,
  purchaseStatus,
}: {
  planName: string | null | undefined;
  purchaseStatus: PurchaseStatus | null | undefined;
}): {
  color: ChipColor;
  children: string;
} | null => {
  const isUserAccount = !purchaseStatus;
  if (isUserAccount) {
    return { color: "neutral", children: "Hobby" };
  }

  switch (purchaseStatus) {
    case PurchaseStatus.Active:
      return planName ? { color: "info", children: planName } : null;

    case PurchaseStatus.Trialing:
      return { color: "info", children: "Trial" };

    case PurchaseStatus.Unpaid:
      return { color: "danger", children: "Unpaid" };

    default:
      return null;
  }
};

export const PlanChip = ({
  planName,
  purchaseStatus,
}: {
  planName: string | null | undefined;
  purchaseStatus: PurchaseStatus | null | undefined;
}) => {
  const chipProps = getChipProps({ planName, purchaseStatus });
  return chipProps ? <Chip scale="xs" {...chipProps} /> : null;
};
