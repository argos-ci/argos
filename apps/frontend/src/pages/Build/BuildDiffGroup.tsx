import { assertNever } from "@argos/util/assertNever";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  MinusCircleIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";

import { ScreenshotDiffStatus } from "@/gql/graphql";

import type { DiffGroup } from "./BuildDiffState";

export const GROUPS = [
  ScreenshotDiffStatus.Failure,
  ScreenshotDiffStatus.Changed,
  ScreenshotDiffStatus.Added,
  ScreenshotDiffStatus.Removed,
  ScreenshotDiffStatus.Unchanged,
  ScreenshotDiffStatus.RetryFailure,
] as const;

export const getGroupColor = (name: DiffGroup["name"]) => {
  switch (name) {
    case ScreenshotDiffStatus.Failure:
      return "danger" as const;
    case ScreenshotDiffStatus.Changed:
    case ScreenshotDiffStatus.Added:
    case ScreenshotDiffStatus.Removed:
      return "warning" as const;
    case ScreenshotDiffStatus.RetryFailure:
      return "neutral" as const;
    case ScreenshotDiffStatus.Unchanged:
      return "success" as const;
    default:
      assertNever(name);
  }
};

export const getGroupLabel = (name: DiffGroup["name"]) => {
  switch (name) {
    case ScreenshotDiffStatus.Failure:
      return "End-to-end test failures";
    case ScreenshotDiffStatus.Changed:
      return "Changed";
    case ScreenshotDiffStatus.Added:
      return "Added";
    case ScreenshotDiffStatus.Removed:
      return "Removed";
    case ScreenshotDiffStatus.Unchanged:
      return "Unchanged";
    case ScreenshotDiffStatus.RetryFailure:
      return "End-to-end retried failures";
    default:
      assertNever(name);
  }
};

export const getGroupIcon = (name: DiffGroup["name"]) => {
  switch (name) {
    case ScreenshotDiffStatus.Added:
      return <PlusCircleIcon />;
    case ScreenshotDiffStatus.Removed:
      return <MinusCircleIcon />;
    case ScreenshotDiffStatus.Changed:
      return <AlertCircleIcon />;
    case ScreenshotDiffStatus.Unchanged:
      return <CheckCircle2Icon />;
    case ScreenshotDiffStatus.Failure:
      return <XCircleIcon />;
    case ScreenshotDiffStatus.RetryFailure:
      return <RotateCcwIcon />;
    default:
      assertNever(name);
  }
};
