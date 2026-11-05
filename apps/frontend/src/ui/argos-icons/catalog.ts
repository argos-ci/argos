import type { ComponentType } from "react";
import {
  GitMergeIcon as OcticonGitMergeIcon,
  GitPullRequestClosedIcon as OcticonGitPullRequestClosedIcon,
  GitPullRequestDraftIcon as OcticonGitPullRequestDraftIcon,
  GitPullRequestIcon as OcticonGitPullRequestIcon,
  LightBulbIcon as OcticonLightBulbIcon,
} from "@primer/octicons-react";
import * as Lucide from "lucide-react";

import * as Current from "../Icons";
import * as Chrome from "./chrome";
import * as Comments from "./comments";
import * as Content from "./content";
import * as Editor from "./editor";
import * as Git from "./git";
import * as Metadata from "./metadata";
import * as Navigation from "./navigation";
import * as Review from "./review";
import * as Status from "./status";
import * as Viewer from "./viewer";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

export type IconEntry = {
  /** The export name. */
  name: string;
  Icon: IconComponent;
  /** What the build page draws today. */
  replaces: IconComponent;
  /** Where the build page draws it. */
  usage: string;
};

type IconGroup = {
  title: string;
  description: string;
  icons: IconEntry[];
};

/**
 * Every icon the build page draws — found by walking its imports — grouped by
 * where it appears, next to the icon it replaces.
 */
export const iconGroups: IconGroup[] = [
  {
    title: "Review and status",
    description:
      "Build, change and review statuses: one washed badge, the mark and the color carry the difference.",
    icons: [
      {
        name: "ThumbsUpIcon",
        Icon: Review.ThumbsUpIcon,
        replaces: Lucide.ThumbsUpIcon,
        usage: "Approve, approved build, accepted change",
      },
      {
        name: "ThumbsDownIcon",
        Icon: Review.ThumbsDownIcon,
        replaces: Lucide.ThumbsDownIcon,
        usage: "Reject, rejected build, rejected change",
      },
      {
        name: "CircleCheckIcon",
        Icon: Status.CircleCheckIcon,
        replaces: Lucide.CircleCheckIcon,
        usage: "No changes, unchanged group, success toast",
      },
      {
        name: "CircleAlertIcon",
        Icon: Status.CircleAlertIcon,
        replaces: Lucide.CircleAlertIcon,
        usage: "Changed group",
      },
      {
        name: "TriangleAlertIcon",
        Icon: Status.TriangleAlertIcon,
        replaces: Lucide.TriangleAlertIcon,
        usage: "Changes detected, warnings, banners",
      },
      {
        name: "CircleXIcon",
        Icon: Status.CircleXIcon,
        replaces: Lucide.CircleXIcon,
        usage: "Failed or aborted build, test failures",
      },
      {
        name: "CirclePlusIcon",
        Icon: Status.CirclePlusIcon,
        replaces: Lucide.CirclePlusIcon,
        usage: "Added group, new project",
      },
      {
        name: "CircleMinusIcon",
        Icon: Status.CircleMinusIcon,
        replaces: Lucide.CircleMinusIcon,
        usage: "Removed group",
      },
      {
        name: "CircleDotIcon",
        Icon: Status.CircleDotIcon,
        replaces: Lucide.CircleDotIcon,
        usage: "Scheduled build",
      },
      {
        name: "RefreshCcwDotIcon",
        Icon: Navigation.RefreshCcwDotIcon,
        replaces: Lucide.RefreshCcwDotIcon,
        usage: "Build in progress",
      },
      {
        name: "HourglassIcon",
        Icon: Status.HourglassIcon,
        replaces: Lucide.HourglassIcon,
        usage: "Expired build",
      },
      {
        name: "BadgeCheckIcon",
        Icon: Status.BadgeCheckIcon,
        replaces: Lucide.BadgeCheckIcon,
        usage: "Auto-approved build",
      },
      {
        name: "CircleSlashIcon",
        Icon: Status.CircleSlashIcon,
        replaces: Lucide.CircleSlashIcon,
        usage: "Orphan build",
      },
      {
        name: "SquareSlashIcon",
        Icon: Status.SquareSlashIcon,
        replaces: Lucide.SquareSlashIcon,
        usage: "Skipped build and group",
      },
      {
        name: "FlagOffIcon",
        Icon: Status.FlagOffIcon,
        replaces: Lucide.FlagOffIcon,
        usage: "Ignore a change, ignored group",
      },
      {
        name: "WavesIcon",
        Icon: Status.WavesIcon,
        replaces: Lucide.WavesIcon,
        usage: "Flaky test",
      },
      {
        name: "ClockIcon",
        Icon: Status.ClockIcon,
        replaces: Lucide.ClockIcon,
        usage: "Pending review, timestamps",
      },
      {
        name: "PauseIcon",
        Icon: Status.PauseIcon,
        replaces: Lucide.PauseIcon,
        usage: "Paused build",
      },
      {
        name: "BookmarkCheckIcon",
        Icon: Status.BookmarkCheckIcon,
        replaces: Lucide.BookmarkCheckIcon,
        usage: "Reference build",
      },
      {
        name: "BookmarkXIcon",
        Icon: Status.BookmarkXIcon,
        replaces: Lucide.BookmarkXIcon,
        usage: "Reference build without baseline",
      },
      {
        name: "BanIcon",
        Icon: Status.BanIcon,
        replaces: Lucide.BanIcon,
        usage: "Dismissed review, removed reviewer",
      },
      {
        name: "InfoIcon",
        Icon: Status.InfoIcon,
        replaces: Lucide.InfoIcon,
        usage: "Annotations, tooltips, info toast",
      },
      {
        name: "MailCheckIcon",
        Icon: Review.MailCheckIcon,
        replaces: Lucide.MailCheckIcon,
        usage: "Review requested",
      },
      {
        name: "MessageCircleIcon",
        Icon: Review.MessageCircleIcon,
        replaces: Lucide.MessageCircleIcon,
        usage: "Commented review",
      },
      {
        name: "CheckCheckIcon",
        Icon: Navigation.CheckCheckIcon,
        replaces: Lucide.CheckCheckIcon,
        usage: "Everything reviewed",
      },
    ],
  },
  {
    title: "Comparison viewer",
    description:
      "The toolbar over the screenshot. The view modes are one control in five states; the eye is the logo's.",
    icons: [
      {
        name: "BaselineViewIcon",
        Icon: Viewer.BaselineViewIcon,
        replaces: Current.BaselineViewIcon,
        usage: "Show the baseline alone",
      },
      {
        name: "ChangesViewIcon",
        Icon: Viewer.ChangesViewIcon,
        replaces: Current.ChangesViewIcon,
        usage: "Show the changes alone",
      },
      {
        name: "SplitViewIcon",
        Icon: Viewer.SplitViewIcon,
        replaces: Current.SplitViewIcon,
        usage: "Side by side",
      },
      {
        name: "OnionViewIcon",
        Icon: Viewer.OnionViewIcon,
        replaces: Current.OnionViewIcon,
        usage: "Onion skin",
      },
      {
        name: "SwipeViewIcon",
        Icon: Viewer.SwipeViewIcon,
        replaces: Current.SwipeViewIcon,
        usage: "Swipe",
      },
      {
        name: "EyeIcon",
        Icon: Viewer.EyeIcon,
        replaces: Lucide.EyeIcon,
        usage: "Show the diff overlay",
      },
      {
        name: "EyeOffIcon",
        Icon: Viewer.EyeOffIcon,
        replaces: Lucide.EyeOffIcon,
        usage: "No thumbnail to show",
      },
      {
        name: "LocateFixedIcon",
        Icon: Viewer.LocateFixedIcon,
        replaces: Lucide.LocateFixedIcon,
        usage: "Highlight changes",
      },
      {
        name: "HandIcon",
        Icon: Viewer.HandIcon,
        replaces: Lucide.HandIcon,
        usage: "Pan tool",
      },
      {
        name: "ScanTextIcon",
        Icon: Viewer.ScanTextIcon,
        replaces: Lucide.ScanTextIcon,
        usage: "Accessibility snapshot",
      },
      {
        name: "ImageIcon",
        Icon: Content.ImageIcon,
        replaces: Lucide.ImageIcon,
        usage: "Screenshot, thumbnail fallback",
      },
      {
        name: "ExpandIcon",
        Icon: Navigation.ExpandIcon,
        replaces: Lucide.ExpandIcon,
        usage: "Fit to the viewport",
      },
      {
        name: "ShrinkIcon",
        Icon: Navigation.ShrinkIcon,
        replaces: Lucide.ShrinkIcon,
        usage: "Original size",
      },
      {
        name: "MaximizeIcon",
        Icon: Navigation.MaximizeIcon,
        replaces: Lucide.MaximizeIcon,
        usage: "Reset zoom",
      },
      {
        name: "PaintbrushIcon",
        Icon: Viewer.PaintbrushIcon,
        replaces: Lucide.PaintbrushIcon,
        usage: "Viewer appearance settings",
      },
      {
        name: "CopyIcon",
        Icon: Viewer.CopyIcon,
        replaces: Lucide.CopyIcon,
        usage: "Copy the screenshot or a prompt",
      },
      {
        name: "DownloadIcon",
        Icon: Viewer.DownloadIcon,
        replaces: Lucide.DownloadIcon,
        usage: "Download menu",
      },
      {
        name: "FileDownIcon",
        Icon: Content.FileDownIcon,
        replaces: Lucide.FileDownIcon,
        usage: "Download the screenshot",
      },
      {
        name: "BlendIcon",
        Icon: Viewer.BlendIcon,
        replaces: Lucide.BlendIcon,
        usage: "Download the diff mask",
      },
      {
        name: "Layers2Icon",
        Icon: Viewer.Layers2Icon,
        replaces: Lucide.Layers2Icon,
        usage: "Download the masked comparison",
      },
      {
        name: "CodeIcon",
        Icon: Editor.CodeIcon,
        replaces: Lucide.CodeIcon,
        usage: "Copy as code, inline code",
      },
      {
        name: "EllipsisVerticalIcon",
        Icon: Navigation.EllipsisVerticalIcon,
        replaces: Lucide.EllipsisVerticalIcon,
        usage: "Screenshot actions",
      },
      {
        name: "PlusIcon",
        Icon: Navigation.PlusIcon,
        replaces: Lucide.PlusIcon,
        usage: "Zoom in, add reviewer",
      },
      {
        name: "MinusIcon",
        Icon: Navigation.MinusIcon,
        replaces: Lucide.MinusIcon,
        usage: "Zoom out, checkbox mixed",
      },
    ],
  },
  {
    title: "Comments",
    description:
      "Pinned on screenshots and threaded in the sidebar. A comment is the washed bubble; hidden is the bubble ghosted.",
    icons: [
      {
        name: "MessageSquareIcon",
        Icon: Comments.MessageSquareIcon,
        replaces: Lucide.MessageSquareIcon,
        usage: "Comments shown, pins, pending comments",
      },
      {
        name: "MessageSquarePlusIcon",
        Icon: Comments.MessageSquarePlusIcon,
        replaces: Lucide.MessageSquarePlusIcon,
        usage: "Comment tool, add a comment",
      },
      {
        name: "MessageSquareCheckIcon",
        Icon: Comments.MessageSquareCheckIcon,
        replaces: Lucide.MessageSquareCheckIcon,
        usage: "Resolve a thread",
      },
      {
        name: "MessageSquareOffIcon",
        Icon: Comments.MessageSquareOffIcon,
        replaces: Lucide.MessageSquareOffIcon,
        usage: "Comments hidden",
      },
      {
        name: "MessagesSquareIcon",
        Icon: Comments.MessagesSquareIcon,
        replaces: Lucide.MessagesSquareIcon,
        usage: "Feedback (account menu)",
      },
      {
        name: "BellIcon",
        Icon: Comments.BellIcon,
        replaces: Lucide.BellIcon,
        usage: "Subscribe to a thread",
      },
      {
        name: "BellOffIcon",
        Icon: Comments.BellOffIcon,
        replaces: Lucide.BellOffIcon,
        usage: "Unsubscribe from a thread",
      },
      {
        name: "PencilIcon",
        Icon: Comments.PencilIcon,
        replaces: Lucide.PencilIcon,
        usage: "Edit a comment",
      },
      {
        name: "TrashIcon",
        Icon: Comments.TrashIcon,
        replaces: Lucide.Trash2Icon,
        usage: "Delete a comment or link",
      },
      {
        name: "SparklesIcon",
        Icon: Comments.SparklesIcon,
        replaces: Lucide.SparklesIcon,
        usage: "Ask AI about a comment",
      },
      {
        name: "SmilePlusIcon",
        Icon: Comments.SmilePlusIcon,
        replaces: Lucide.SmilePlusIcon,
        usage: "Add a reaction",
      },
      {
        name: "MapPinIcon",
        Icon: Comments.MapPinIcon,
        replaces: Lucide.MapPinIcon,
        usage: "Where a comment is pinned",
      },
      {
        name: "ArrowUpIcon",
        Icon: Navigation.ArrowUpIcon,
        replaces: Lucide.ArrowUpIcon,
        usage: "Send, previous screenshot",
      },
    ],
  },
  {
    title: "Comment editor",
    description:
      "Letterforms stay bare ink; a block (quote, code) is washed because the wash is the block.",
    icons: [
      {
        name: "BoldIcon",
        Icon: Editor.BoldIcon,
        replaces: Lucide.BoldIcon,
        usage: "Bold",
      },
      {
        name: "ItalicIcon",
        Icon: Editor.ItalicIcon,
        replaces: Lucide.ItalicIcon,
        usage: "Italic",
      },
      {
        name: "UnderlineIcon",
        Icon: Editor.UnderlineIcon,
        replaces: Lucide.UnderlineIcon,
        usage: "Underline",
      },
      {
        name: "StrikethroughIcon",
        Icon: Editor.StrikethroughIcon,
        replaces: Lucide.StrikethroughIcon,
        usage: "Strikethrough",
      },
      {
        name: "Heading1Icon",
        Icon: Editor.Heading1Icon,
        replaces: Lucide.Heading1Icon,
        usage: "Heading 1",
      },
      {
        name: "Heading2Icon",
        Icon: Editor.Heading2Icon,
        replaces: Lucide.Heading2Icon,
        usage: "Heading 2",
      },
      {
        name: "Heading3Icon",
        Icon: Editor.Heading3Icon,
        replaces: Lucide.Heading3Icon,
        usage: "Heading 3",
      },
      {
        name: "ListIcon",
        Icon: Editor.ListIcon,
        replaces: Lucide.ListIcon,
        usage: "Bulleted list",
      },
      {
        name: "ListOrderedIcon",
        Icon: Editor.ListOrderedIcon,
        replaces: Lucide.ListOrderedIcon,
        usage: "Numbered list",
      },
      {
        name: "QuoteIcon",
        Icon: Editor.QuoteIcon,
        replaces: Lucide.QuoteIcon,
        usage: "Quote",
      },
      {
        name: "SquareCodeIcon",
        Icon: Editor.SquareCodeIcon,
        replaces: Lucide.SquareCodeIcon,
        usage: "Code block",
      },
      {
        name: "LinkIcon",
        Icon: Navigation.LinkIcon,
        replaces: Lucide.LinkIcon,
        usage: "Insert or copy a link",
      },
      {
        name: "ExternalLinkIcon",
        Icon: Navigation.ExternalLinkIcon,
        replaces: Lucide.ExternalLinkIcon,
        usage: "Open a link",
      },
    ],
  },
  {
    title: "Tests, stories and overview",
    description:
      "The sidebar's metadata rows and the build overview's summaries.",
    icons: [
      {
        name: "FlaskConicalIcon",
        Icon: Metadata.FlaskConicalIcon,
        replaces: Lucide.FlaskConicalIcon,
        usage: "Test, automation library",
      },
      {
        name: "BookMarkedIcon",
        Icon: Metadata.BookMarkedIcon,
        replaces: Lucide.BookMarkedIcon,
        usage: "Story",
      },
      {
        name: "PlayIcon",
        Icon: Metadata.PlayIcon,
        replaces: Lucide.PlayIcon,
        usage: "Story play function",
      },
      {
        name: "ComponentIcon",
        Icon: Metadata.ComponentIcon,
        replaces: Lucide.ComponentIcon,
        usage: "Components impacted",
      },
      {
        name: "BugPlayIcon",
        Icon: Metadata.BugPlayIcon,
        replaces: Lucide.BugPlayIcon,
        usage: "Playwright trace",
      },
      {
        name: "TagIcon",
        Icon: Metadata.TagIcon,
        replaces: Lucide.TagIcon,
        usage: "Tags",
      },
      {
        name: "TargetIcon",
        Icon: Metadata.TargetIcon,
        replaces: Lucide.TargetIcon,
        usage: "Diff threshold",
      },
      {
        name: "SlidersHorizontalIcon",
        Icon: Metadata.SlidersHorizontalIcon,
        replaces: Lucide.SlidersHorizontalIcon,
        usage: "Variants",
      },
      {
        name: "RepeatIcon",
        Icon: Navigation.RepeatIcon,
        replaces: Lucide.RepeatIcon,
        usage: "Repeated test",
      },
      {
        name: "RotateCcwIcon",
        Icon: Navigation.RotateCcwIcon,
        replaces: Lucide.RotateCcwIcon,
        usage: "Retried test, retried failures",
      },
      {
        name: "GlobeIcon",
        Icon: Metadata.GlobeIcon,
        replaces: Lucide.GlobeIcon,
        usage: "URL, browser",
      },
      {
        name: "CloudDownloadIcon",
        Icon: Metadata.CloudDownloadIcon,
        replaces: Lucide.CloudDownloadIcon,
        usage: "SDK update available",
      },
      {
        name: "PackageXIcon",
        Icon: Metadata.PackageXIcon,
        replaces: Lucide.PackageXIcon,
        usage: "Unsupported SDK",
      },
      {
        name: "ScanEyeIcon",
        Icon: Viewer.ScanEyeIcon,
        replaces: Lucide.ScanEyeIcon,
        usage: "Screenshots to review",
      },
      {
        name: "ImagePlusIcon",
        Icon: Content.ImagePlusIcon,
        replaces: Lucide.ImagePlusIcon,
        usage: "Screenshots added",
      },
      {
        name: "ImageMinusIcon",
        Icon: Content.ImageMinusIcon,
        replaces: Lucide.ImageMinusIcon,
        usage: "Screenshots removed",
      },
      {
        name: "ImagesIcon",
        Icon: Content.ImagesIcon,
        replaces: Lucide.ImagesIcon,
        usage: "Screenshot list, empty state",
      },
      {
        name: "FileIcon",
        Icon: Content.FileIcon,
        replaces: Lucide.FileIcon,
        usage: "Non-image snapshot",
      },
      {
        name: "FileUpIcon",
        Icon: Content.FileUpIcon,
        replaces: Lucide.FileUpIcon,
        usage: "Build uploaded",
      },
      {
        name: "GaugeIcon",
        Icon: Metadata.GaugeIcon,
        replaces: Lucide.GaugeIcon,
        usage: "Change summary",
      },
      {
        name: "RadarIcon",
        Icon: Metadata.RadarIcon,
        replaces: Lucide.RadarIcon,
        usage: "Impact analysis",
      },
      {
        name: "LightbulbIcon",
        Icon: Metadata.LightbulbIcon,
        replaces: OcticonLightBulbIcon,
        usage: "Next steps (was an Octicon)",
      },
    ],
  },
  {
    title: "Environment",
    description:
      "The device and color scheme a screenshot was taken in. The screen is the subject, so the screen is washed.",
    icons: [
      {
        name: "MonitorSmartphoneIcon",
        Icon: Metadata.MonitorSmartphoneIcon,
        replaces: Lucide.MonitorSmartphoneIcon,
        usage: "Viewports",
      },
      {
        name: "MonitorIcon",
        Icon: Metadata.MonitorIcon,
        replaces: Lucide.MonitorIcon,
        usage: "Desktop, system theme",
      },
      {
        name: "LaptopIcon",
        Icon: Metadata.LaptopIcon,
        replaces: Lucide.LaptopIcon,
        usage: "Laptop viewport",
      },
      {
        name: "TabletIcon",
        Icon: Metadata.TabletIcon,
        replaces: Lucide.TabletIcon,
        usage: "Tablet viewport",
      },
      {
        name: "SmartphoneIcon",
        Icon: Metadata.SmartphoneIcon,
        replaces: Lucide.SmartphoneIcon,
        usage: "Mobile viewport",
      },
      {
        name: "PrinterIcon",
        Icon: Metadata.PrinterIcon,
        replaces: Lucide.PrinterIcon,
        usage: "Print media",
      },
      {
        name: "SunMoonIcon",
        Icon: Metadata.SunMoonIcon,
        replaces: Lucide.SunMoonIcon,
        usage: "Color schemes",
      },
      {
        name: "SunIcon",
        Icon: Metadata.SunIcon,
        replaces: Lucide.SunIcon,
        usage: "Light scheme",
      },
      {
        name: "MoonIcon",
        Icon: Metadata.MoonIcon,
        replaces: Lucide.MoonIcon,
        usage: "Dark scheme",
      },
    ],
  },
  {
    title: "Git and build mode",
    description:
      "Where a build comes from. Commits are washed nodes; the pull request states replace Octicons.",
    icons: [
      {
        name: "GitBranchIcon",
        Icon: Git.GitBranchIcon,
        replaces: Lucide.GitBranchIcon,
        usage: "Branch",
      },
      {
        name: "GitCompareArrowsIcon",
        Icon: Git.GitCompareArrowsIcon,
        replaces: Lucide.GitCompareArrowsIcon,
        usage: "Baseline",
      },
      {
        name: "GitPullRequestIcon",
        Icon: Git.GitPullRequestIcon,
        replaces: Lucide.GitPullRequestIcon,
        usage: "CI mode",
      },
      {
        name: "GitPullRequestIcon",
        Icon: Git.GitPullRequestIcon,
        replaces: OcticonGitPullRequestIcon,
        usage: "Open pull request (was an Octicon)",
      },
      {
        name: "GitPullRequestDraftIcon",
        Icon: Git.GitPullRequestDraftIcon,
        replaces: OcticonGitPullRequestDraftIcon,
        usage: "Draft pull request (was an Octicon)",
      },
      {
        name: "GitPullRequestClosedIcon",
        Icon: Git.GitPullRequestClosedIcon,
        replaces: OcticonGitPullRequestClosedIcon,
        usage: "Closed pull request (was an Octicon)",
      },
      {
        name: "GitMergeIcon",
        Icon: Git.GitMergeIcon,
        replaces: OcticonGitMergeIcon,
        usage: "Merged pull request (was an Octicon)",
      },
      {
        name: "TowerControlIcon",
        Icon: Chrome.TowerControlIcon,
        replaces: Lucide.TowerControlIcon,
        usage: "Monitoring mode",
      },
      {
        name: "SquareStackIcon",
        Icon: Content.SquareStackIcon,
        replaces: Lucide.SquareStackIcon,
        usage: "Merge queue",
      },
    ],
  },
  {
    title: "Navigation",
    description:
      "Verbs: bare ink, except where the icon has a subject — the lens, the house, the panel it toggles.",
    icons: [
      {
        name: "ChevronDownIcon",
        Icon: Navigation.ChevronDownIcon,
        replaces: Lucide.ChevronDownIcon,
        usage: "Expand, menus",
      },
      {
        name: "ChevronUpIcon",
        Icon: Navigation.ChevronUpIcon,
        replaces: Lucide.ChevronUpIcon,
        usage: "Collapse",
      },
      {
        name: "ChevronLeftIcon",
        Icon: Navigation.ChevronLeftIcon,
        replaces: Lucide.ChevronLeftIcon,
        usage: "Previous change",
      },
      {
        name: "ChevronRightIcon",
        Icon: Navigation.ChevronRightIcon,
        replaces: Lucide.ChevronRightIcon,
        usage: "Next change, journey",
      },
      {
        name: "ChevronsUpDownIcon",
        Icon: Navigation.ChevronsUpDownIcon,
        replaces: Lucide.ChevronsUpDownIcon,
        usage: "Expand a thread, select",
      },
      {
        name: "ChevronsDownUpIcon",
        Icon: Navigation.ChevronsDownUpIcon,
        replaces: Lucide.ChevronsDownUpIcon,
        usage: "Collapse a thread",
      },
      {
        name: "ArrowDownIcon",
        Icon: Navigation.ArrowDownIcon,
        replaces: Lucide.ArrowDownIcon,
        usage: "Next screenshot, sort",
      },
      {
        name: "ArrowUpDownIcon",
        Icon: Navigation.ArrowUpDownIcon,
        replaces: Lucide.ArrowUpDownIcon,
        usage: "Sort",
      },
      {
        name: "CornerDownRightIcon",
        Icon: Navigation.CornerDownRightIcon,
        replaces: Lucide.CornerDownRightIcon,
        usage: "Nested screenshot",
      },
      {
        name: "XIcon",
        Icon: Navigation.XIcon,
        replaces: Lucide.XIcon,
        usage: "Close, clear",
      },
      {
        name: "CheckIcon",
        Icon: Navigation.CheckIcon,
        replaces: Lucide.CheckIcon,
        usage: "Selected, copied, checkbox",
      },
      {
        name: "EllipsisIcon",
        Icon: Navigation.EllipsisIcon,
        replaces: Lucide.EllipsisIcon,
        usage: "More actions",
      },
      {
        name: "SearchIcon",
        Icon: Navigation.SearchIcon,
        replaces: Lucide.SearchIcon,
        usage: "Search screenshots, shortcuts",
      },
      {
        name: "FunnelIcon",
        Icon: Chrome.FunnelIcon,
        replaces: Lucide.FunnelIcon,
        usage: "Filters",
      },
      {
        name: "FunnelPlusIcon",
        Icon: Chrome.FunnelPlusIcon,
        replaces: Lucide.FunnelPlusIcon,
        usage: "Filter by this value",
      },
      {
        name: "FunnelXIcon",
        Icon: Chrome.FunnelXIcon,
        replaces: Lucide.FunnelXIcon,
        usage: "Exclude this value",
      },
      {
        name: "PanelRightIcon",
        Icon: Navigation.PanelRightIcon,
        replaces: Lucide.PanelRightIcon,
        usage: "Toggle the sidebar",
      },
      {
        name: "HouseIcon",
        Icon: Navigation.HouseIcon,
        replaces: Lucide.HouseIcon,
        usage: "Build overview",
      },
      {
        name: "WaypointsIcon",
        Icon: Chrome.WaypointsIcon,
        replaces: Lucide.WaypointsIcon,
        usage: "Screenshot journey",
      },
      {
        name: "HistoryIcon",
        Icon: Navigation.HistoryIcon,
        replaces: Lucide.HistoryIcon,
        usage: "Newer build available",
      },
      {
        name: "RefreshCcwIcon",
        Icon: Navigation.RefreshCcwIcon,
        replaces: Lucide.RefreshCcwIcon,
        usage: "Reload",
      },
    ],
  },
  {
    title: "Account menu",
    description: "The avatar menu in the header, and who did what.",
    icons: [
      {
        name: "SettingsIcon",
        Icon: Chrome.SettingsIcon,
        replaces: Lucide.SettingsIcon,
        usage: "Settings",
      },
      {
        name: "SquareActivityIcon",
        Icon: Chrome.SquareActivityIcon,
        replaces: Lucide.SquareActivityIcon,
        usage: "Status page",
      },
      {
        name: "FileTextIcon",
        Icon: Content.FileTextIcon,
        replaces: Lucide.FileTextIcon,
        usage: "Documentation",
      },
      {
        name: "CommandIcon",
        Icon: Chrome.CommandIcon,
        replaces: Lucide.CommandIcon,
        usage: "Keyboard shortcuts",
      },
      {
        name: "TerminalIcon",
        Icon: Chrome.TerminalIcon,
        replaces: Lucide.TerminalIcon,
        usage: "Argos CLI",
      },
      {
        name: "BotIcon",
        Icon: Chrome.BotIcon,
        replaces: Lucide.BotIcon,
        usage: "Agent and bot authors",
      },
      {
        name: "LogOutIcon",
        Icon: Chrome.LogOutIcon,
        replaces: Lucide.LogOutIcon,
        usage: "Log out",
      },
    ],
  },
];
