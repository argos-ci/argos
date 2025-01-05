import {
  ClockIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";

import { BuildReviewState } from "@/gql/graphql";

export const buildReviewDescriptors: Record<
  BuildReviewState,
  {
    label: string;
    icon: LucideIcon;
    textColor: string;
  }
> = {
  [BuildReviewState.Approved]: {
    label: "Approved",
    icon: ThumbsUpIcon,
    textColor: "text-success-low",
  },
  [BuildReviewState.Rejected]: {
    label: "Rejected",
    icon: ThumbsDownIcon,
    textColor: "text-danger-low",
  },
  [BuildReviewState.Pending]: {
    label: "Pending",
    icon: ClockIcon,
    textColor: "text-pending-low",
  },
};
