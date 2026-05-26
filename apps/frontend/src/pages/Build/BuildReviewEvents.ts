import {
  MessageSquareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";

import { BuildReviewEvent } from "@/gql/graphql";
import type { ButtonProps } from "@/ui/Button";

export type BuildReviewEventDefinition = {
  label: string;
  description: string;
  color: NonNullable<ButtonProps["variant"]>;
  icon: LucideIcon;
};

export const BUILD_REVIEW_EVENT_DEFINITIONS: Record<
  BuildReviewEvent,
  BuildReviewEventDefinition
> = {
  [BuildReviewEvent.Approve]: {
    label: "Approve",
    description: "Submit feedback and approve merging these changes.",
    color: "primary",
    icon: ThumbsUpIcon,
  },
  [BuildReviewEvent.Reject]: {
    label: "Reject",
    description: "Submit feedback about rejection.",
    color: "destructive",
    icon: ThumbsDownIcon,
  },
  [BuildReviewEvent.Comment]: {
    label: "Comment",
    description: "Submit general feedback without explicit approval.",
    color: "secondary",
    icon: MessageSquareIcon,
  },
};
