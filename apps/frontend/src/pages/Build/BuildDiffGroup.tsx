import {
  CheckCircle2Icon,
  XCircleIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  AlertCircleIcon,
} from "lucide-react";

import type { DiffGroup } from "./BuildDiffState";

export const GROUPS = [
  "failure",
  "changed",
  "added",
  "removed",
  "unchanged",
] as const;

export const getGroupColor = (name: DiffGroup["name"]) => {
  switch (name) {
    case "failure":
      return "danger" as const;
    case "changed":
      return "warning" as const;
    case "added":
      return "neutral" as const;
    case "removed":
      return "neutral" as const;
    case "unchanged":
      return "success" as const;
    default:
      throw new Error(`Unknown group: ${name}`);
  }
};

export const getGroupLabel = (name: DiffGroup["name"]) => {
  switch (name) {
    case "failure":
      return "Failures";
    case "changed":
      return "Changed";
    case "added":
      return "Added";
    case "removed":
      return "Removed";
    case "unchanged":
      return "Unchanged";
    default:
      throw new Error(`Unknown group: ${name}`);
  }
};

export const getGroupIcon = (name: DiffGroup["name"]) => {
  switch (name) {
    case "added":
      return <PlusCircleIcon />;
    case "removed":
      return <MinusCircleIcon />;
    case "changed":
      return <AlertCircleIcon />;
    case "unchanged":
      return <CheckCircle2Icon />;
    case "failure":
      return <XCircleIcon />;
    default:
      throw new Error(`Unknown group: ${name}`);
  }
};
