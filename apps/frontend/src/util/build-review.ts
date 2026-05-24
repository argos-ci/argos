import {
  BanIcon,
  ClockIcon,
  MessageCircleIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";

import { ReviewState } from "@/gql/graphql";

export const buildReviewDescriptors: Record<
  ReviewState,
  {
    label: string;
    icon: LucideIcon;
    textColor: string;
  }
> = {
  [ReviewState.Approved]: {
    label: "Approved",
    icon: ThumbsUpIcon,
    textColor: "text-success-low",
  },
  [ReviewState.Rejected]: {
    label: "Rejected",
    icon: ThumbsDownIcon,
    textColor: "text-danger-low",
  },
  [ReviewState.Commented]: {
    label: "Reviewed",
    icon: MessageCircleIcon,
    textColor: "text-info-low",
  },
  [ReviewState.Dismissed]: {
    label: "Dismissed",
    icon: BanIcon,
    textColor: "text-low",
  },
  [ReviewState.Pending]: {
    label: "Pending",
    icon: ClockIcon,
    textColor: "text-low",
  },
};
