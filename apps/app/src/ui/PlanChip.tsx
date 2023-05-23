import { PurchaseStatus } from "@/gql/graphql";

import { Chip, ChipColor } from "./Chip";

const getChipProps = ({
  isUserAccount,
  planName,
  purchaseStatus,
}: {
  isUserAccount: boolean;
  planName: string | null | undefined;
  purchaseStatus: PurchaseStatus | null | undefined;
}): {
  color: ChipColor;
  children: string;
} | null => {
  if (isUserAccount) {
    return { color: "neutral", children: "Hobby" };
  }
  if (!purchaseStatus) return null;

  switch (purchaseStatus) {
    case PurchaseStatus.Active && planName:
      return { color: "info", children: planName! };

    case PurchaseStatus.Trialing:
      return { color: "info", children: "Trial" };

    case PurchaseStatus.Unpaid:
      return { color: "danger", children: "Unpaid" };

    default:
      return null;
  }
};

export const PlanChip = ({
  isUserAccount,
  planName,
  purchaseStatus,
}: {
  isUserAccount: boolean;
  planName: string | null | undefined;
  purchaseStatus: PurchaseStatus | null | undefined;
}) => {
  const chipProps = getChipProps({ isUserAccount, planName, purchaseStatus });

  if (!chipProps) {
    return null;
  }

  return <Chip scale="xs" {...chipProps} />;
};
