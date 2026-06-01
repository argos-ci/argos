import {
  MessageCircleIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";

import { BuildReviewEvent } from "@/gql/graphql";

export type ReviewEventRadioVariant = "primary" | "secondary" | "destructive";

export type BuildReviewEventDefinition = {
  label: string;
  description: string;
  variant: ReviewEventRadioVariant;
  icon: LucideIcon;
};

export const BUILD_REVIEW_EVENT_DEFINITIONS: Record<
  BuildReviewEvent,
  BuildReviewEventDefinition
> = {
  [BuildReviewEvent.Approve]: {
    label: "Approve",
    description: "Submit feedback and approve merging these changes.",
    variant: "primary",
    icon: ThumbsUpIcon,
  },
  [BuildReviewEvent.Reject]: {
    label: "Reject",
    description: "Submit feedback about rejection.",
    variant: "destructive",
    icon: ThumbsDownIcon,
  },
  [BuildReviewEvent.Comment]: {
    label: "Comment",
    description: "Submit general feedback without explicit approval.",
    variant: "secondary",
    icon: MessageCircleIcon,
  },
};
