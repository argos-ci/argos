import {
  FileDiffIcon,
  ChecklistIcon,
  FileAddedIcon,
  FileRemovedIcon,
  FileIcon,
} from "@primer/octicons-react";

export function ScreenshotDiffStatusIcon(type) {
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
