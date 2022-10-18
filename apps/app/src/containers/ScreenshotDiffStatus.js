import {
  FileDiffIcon,
  ChecklistIcon,
  FileAddedIcon,
  FileRemovedIcon,
  FileIcon,
} from "@primer/octicons-react";

export function getDiffStatusColor(status) {
  switch (status) {
    case "added":
      return "success";
    case "stable":
      return "success";
    case "updated":
      return "warning";
    case "failed":
      return "danger";
    case "removed":
      return "danger";
    default:
      return "neutral";
  }
}

export function getDiffStatusIcon(type) {
  switch (type) {
    case "added":
      return FileAddedIcon;
    case "failed":
      return FileIcon;
    case "updated":
      return FileDiffIcon;
    case "removed":
      return FileRemovedIcon;
    case "stable":
      return ChecklistIcon;
    default:
      return null;
  }
}
