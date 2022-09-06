import {
  FileDiffIcon,
  ChecklistIcon,
  FileAddedIcon,
  FileRemovedIcon,
} from "@primer/octicons-react";

export function ScreenshotDiffTypeIcon(type) {
  switch (type) {
    case "new":
      return FileAddedIcon;
    case "update":
      return FileDiffIcon;
    case "delete":
      return FileRemovedIcon;
    case "passing":
      return ChecklistIcon;
    default:
      return null;
  }
}
