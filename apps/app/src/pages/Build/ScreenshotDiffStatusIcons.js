import {
  FileDiffIcon,
  ChecklistIcon,
  FileAddedIcon,
  FileRemovedIcon,
} from "@primer/octicons-react";

export function ScreenshotDiffStatusIcon(type) {
  switch (type) {
    case "added":
      return FileAddedIcon;
    case "updated":
      return FileDiffIcon;
    case "deleted":
      return FileRemovedIcon;
    case "stable":
      return ChecklistIcon;
    default:
      return null;
  }
}
