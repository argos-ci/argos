import {
  MessageCircleIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";

import { BuildReviewEvent } from "@/gql/graphql";
import type { UIColor } from "@/util/colors";

export type ReviewEventRadioVariant = "primary" | "secondary" | "destructive";

export type BuildReviewEventDefinition = {
  label: string;
  description: string;
  variant: ReviewEventRadioVariant;
  icon: LucideIcon;
  iconColor: UIColor | null;
};

export const BUILD_REVIEW_EVENT_DEFINITIONS: Record<
  BuildReviewEvent,
  BuildReviewEventDefinition
> = {
  [BuildReviewEvent.Approve]: {
    label: "Approve",
    description: "Submit feedback and approve merging these changes.",
    variant: "secondary",
    icon: ThumbsUpIcon,
    iconColor: "success",
  },
  [BuildReviewEvent.Reject]: {
    label: "Reject",
    description: "Submit feedback about rejection.",
    variant: "secondary",
    icon: ThumbsDownIcon,
    iconColor: "danger",
  },
  [BuildReviewEvent.Comment]: {
    label: "Comment",
    description: "Submit general feedback without explicit approval.",
    variant: "secondary",
    icon: MessageCircleIcon,
    iconColor: null,
  },
};
