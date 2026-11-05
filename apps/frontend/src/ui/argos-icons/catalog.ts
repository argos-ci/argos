import type { ComponentType } from "react";
import {
  GitMergeIcon as OcticonGitMergeIcon,
  GitPullRequestClosedIcon as OcticonGitPullRequestClosedIcon,
  GitPullRequestDraftIcon as OcticonGitPullRequestDraftIcon,
  GitPullRequestIcon as OcticonGitPullRequestIcon,
  LightBulbIcon as OcticonLightBulbIcon,
} from "@primer/octicons-react";
import * as Lucide from "lucide-react";

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
  /** The stock icon it replaced; the view modes were already Argos's own. */
  replaced?: IconComponent;
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
 * where it appears, next to the stock icon it replaced.
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
        replaced: Lucide.ThumbsUpIcon,
        usage: "Approve, approved build, accepted change",
      },
      {
        name: "ThumbsDownIcon",
        Icon: Review.ThumbsDownIcon,
        replaced: Lucide.ThumbsDownIcon,
        usage: "Reject, rejected build, rejected change",
      },
      {
        name: "CircleCheckIcon",
        Icon: Status.CircleCheckIcon,
        replaced: Lucide.CircleCheckIcon,
        usage: "No changes, unchanged group, success toast",
      },
      {
        name: "CircleAlertIcon",
        Icon: Status.CircleAlertIcon,
        replaced: Lucide.CircleAlertIcon,
        usage: "Changed group",
      },
      {
        name: "TriangleAlertIcon",
        Icon: Status.TriangleAlertIcon,
        replaced: Lucide.TriangleAlertIcon,
        usage: "Changes detected, warnings, banners",
      },
      {
        name: "CircleXIcon",
        Icon: Status.CircleXIcon,
        replaced: Lucide.CircleXIcon,
        usage: "Failed or aborted build, test failures",
      },
      {
        name: "CirclePlusIcon",
        Icon: Status.CirclePlusIcon,
        replaced: Lucide.CirclePlusIcon,
        usage: "Added group, new project",
      },
      {
        name: "CircleMinusIcon",
        Icon: Status.CircleMinusIcon,
        replaced: Lucide.CircleMinusIcon,
        usage: "Removed group",
      },
      {
        name: "CircleDotIcon",
        Icon: Status.CircleDotIcon,
        replaced: Lucide.CircleDotIcon,
        usage: "Scheduled build",
      },
      {
        name: "RefreshCcwDotIcon",
        Icon: Navigation.RefreshCcwDotIcon,
        replaced: Lucide.RefreshCcwDotIcon,
        usage: "Build in progress",
      },
      {
        name: "HourglassIcon",
        Icon: Status.HourglassIcon,
        replaced: Lucide.HourglassIcon,
        usage: "Expired build",
      },
      {
        name: "BadgeCheckIcon",
        Icon: Status.BadgeCheckIcon,
        replaced: Lucide.BadgeCheckIcon,
        usage: "Auto-approved build",
      },
      {
        name: "CircleSlashIcon",
        Icon: Status.CircleSlashIcon,
        replaced: Lucide.CircleSlashIcon,
        usage: "Orphan build",
      },
      {
        name: "SquareSlashIcon",
        Icon: Status.SquareSlashIcon,
        replaced: Lucide.SquareSlashIcon,
        usage: "Skipped build and group",
      },
      {
        name: "FlagOffIcon",
        Icon: Status.FlagOffIcon,
        replaced: Lucide.FlagOffIcon,
        usage: "Ignore a change, ignored group",
      },
      {
        name: "WavesIcon",
        Icon: Status.WavesIcon,
        replaced: Lucide.WavesIcon,
        usage: "Flaky test",
      },
      {
        name: "ClockIcon",
        Icon: Status.ClockIcon,
        replaced: Lucide.ClockIcon,
        usage: "Pending review, timestamps",
      },
      {
        name: "PauseIcon",
        Icon: Status.PauseIcon,
        replaced: Lucide.PauseIcon,
        usage: "Paused build",
      },
      {
        name: "BookmarkCheckIcon",
        Icon: Status.BookmarkCheckIcon,
        replaced: Lucide.BookmarkCheckIcon,
        usage: "Reference build",
      },
      {
        name: "BookmarkXIcon",
        Icon: Status.BookmarkXIcon,
        replaced: Lucide.BookmarkXIcon,
        usage: "Reference build without baseline",
      },
      {
        name: "BanIcon",
        Icon: Status.BanIcon,
        replaced: Lucide.BanIcon,
        usage: "Dismissed review, removed reviewer",
      },
      {
        name: "InfoIcon",
        Icon: Status.InfoIcon,
        replaced: Lucide.InfoIcon,
        usage: "Annotations, tooltips, info toast",
      },
      {
        name: "MailCheckIcon",
        Icon: Review.MailCheckIcon,
        replaced: Lucide.MailCheckIcon,
        usage: "Review requested",
      },
      {
        name: "MessageCircleIcon",
        Icon: Review.MessageCircleIcon,
        replaced: Lucide.MessageCircleIcon,
        usage: "Commented review",
      },
      {
        name: "CheckCheckIcon",
        Icon: Navigation.CheckCheckIcon,
        replaced: Lucide.CheckCheckIcon,
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
        usage: "Show the baseline alone",
      },
      {
        name: "ChangesViewIcon",
        Icon: Viewer.ChangesViewIcon,
        usage: "Show the changes alone",
      },
      {
        name: "SplitViewIcon",
        Icon: Viewer.SplitViewIcon,
        usage: "Side by side",
      },
      {
        name: "OnionViewIcon",
        Icon: Viewer.OnionViewIcon,
        usage: "Onion skin",
      },
      {
        name: "SwipeViewIcon",
        Icon: Viewer.SwipeViewIcon,
        usage: "Swipe",
      },
      {
        name: "EyeIcon",
        Icon: Viewer.EyeIcon,
        replaced: Lucide.EyeIcon,
        usage: "Show the diff overlay",
      },
      {
        name: "EyeOffIcon",
        Icon: Viewer.EyeOffIcon,
        replaced: Lucide.EyeOffIcon,
        usage: "No thumbnail to show",
      },
      {
        name: "LocateFixedIcon",
        Icon: Viewer.LocateFixedIcon,
        replaced: Lucide.LocateFixedIcon,
        usage: "Highlight changes",
      },
      {
        name: "HandIcon",
        Icon: Viewer.HandIcon,
        replaced: Lucide.HandIcon,
        usage: "Pan tool",
      },
      {
        name: "ScanTextIcon",
        Icon: Viewer.ScanTextIcon,
        replaced: Lucide.ScanTextIcon,
        usage: "Accessibility snapshot",
      },
      {
        name: "ImageIcon",
        Icon: Content.ImageIcon,
        replaced: Lucide.ImageIcon,
        usage: "Screenshot, thumbnail fallback",
      },
      {
        name: "ExpandIcon",
        Icon: Navigation.ExpandIcon,
        replaced: Lucide.ExpandIcon,
        usage: "Fit to the viewport",
      },
      {
        name: "ShrinkIcon",
        Icon: Navigation.ShrinkIcon,
        replaced: Lucide.ShrinkIcon,
        usage: "Original size",
      },
      {
        name: "MaximizeIcon",
        Icon: Navigation.MaximizeIcon,
        replaced: Lucide.MaximizeIcon,
        usage: "Reset zoom",
      },
      {
        name: "PaintbrushIcon",
        Icon: Viewer.PaintbrushIcon,
        replaced: Lucide.PaintbrushIcon,
        usage: "Viewer appearance settings",
      },
      {
        name: "CopyIcon",
        Icon: Viewer.CopyIcon,
        replaced: Lucide.CopyIcon,
        usage: "Copy the screenshot or a prompt",
      },
      {
        name: "DownloadIcon",
        Icon: Viewer.DownloadIcon,
        replaced: Lucide.DownloadIcon,
        usage: "Download menu",
      },
      {
        name: "FileDownIcon",
        Icon: Content.FileDownIcon,
        replaced: Lucide.FileDownIcon,
        usage: "Download the screenshot",
      },
      {
        name: "BlendIcon",
        Icon: Viewer.BlendIcon,
        replaced: Lucide.BlendIcon,
        usage: "Download the diff mask",
      },
      {
        name: "Layers2Icon",
        Icon: Viewer.Layers2Icon,
        replaced: Lucide.Layers2Icon,
        usage: "Download the masked comparison",
      },
      {
        name: "CodeIcon",
        Icon: Editor.CodeIcon,
        replaced: Lucide.CodeIcon,
        usage: "Copy as code, inline code",
      },
      {
        name: "EllipsisVerticalIcon",
        Icon: Navigation.EllipsisVerticalIcon,
        replaced: Lucide.EllipsisVerticalIcon,
        usage: "Screenshot actions",
      },
      {
        name: "PlusIcon",
        Icon: Navigation.PlusIcon,
        replaced: Lucide.PlusIcon,
        usage: "Zoom in, add reviewer",
      },
      {
        name: "MinusIcon",
        Icon: Navigation.MinusIcon,
        replaced: Lucide.MinusIcon,
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
        replaced: Lucide.MessageSquareIcon,
        usage: "Comments shown, pins, pending comments",
      },
      {
        name: "MessageSquarePlusIcon",
        Icon: Comments.MessageSquarePlusIcon,
        replaced: Lucide.MessageSquarePlusIcon,
        usage: "Comment tool, add a comment",
      },
      {
        name: "MessageSquareCheckIcon",
        Icon: Comments.MessageSquareCheckIcon,
        replaced: Lucide.MessageSquareCheckIcon,
        usage: "Resolve a thread",
      },
      {
        name: "MessageSquareOffIcon",
        Icon: Comments.MessageSquareOffIcon,
        replaced: Lucide.MessageSquareOffIcon,
        usage: "Comments hidden",
      },
      {
        name: "MessagesSquareIcon",
        Icon: Comments.MessagesSquareIcon,
        replaced: Lucide.MessagesSquareIcon,
        usage: "Feedback (account menu)",
      },
      {
        name: "BellIcon",
        Icon: Comments.BellIcon,
        replaced: Lucide.BellIcon,
        usage: "Subscribe to a thread",
      },
      {
        name: "BellOffIcon",
        Icon: Comments.BellOffIcon,
        replaced: Lucide.BellOffIcon,
        usage: "Unsubscribe from a thread",
      },
      {
        name: "PencilIcon",
        Icon: Comments.PencilIcon,
        replaced: Lucide.PencilIcon,
        usage: "Edit a comment",
      },
      {
        name: "TrashIcon",
        Icon: Comments.TrashIcon,
        replaced: Lucide.Trash2Icon,
        usage: "Delete a comment or link",
      },
      {
        name: "SparklesIcon",
        Icon: Comments.SparklesIcon,
        replaced: Lucide.SparklesIcon,
        usage: "Ask AI about a comment",
      },
      {
        name: "SmilePlusIcon",
        Icon: Comments.SmilePlusIcon,
        replaced: Lucide.SmilePlusIcon,
        usage: "Add a reaction",
      },
      {
        name: "MapPinIcon",
        Icon: Comments.MapPinIcon,
        replaced: Lucide.MapPinIcon,
        usage: "Where a comment is pinned",
      },
      {
        name: "ArrowUpIcon",
        Icon: Navigation.ArrowUpIcon,
        replaced: Lucide.ArrowUpIcon,
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
        replaced: Lucide.BoldIcon,
        usage: "Bold",
      },
      {
        name: "ItalicIcon",
        Icon: Editor.ItalicIcon,
        replaced: Lucide.ItalicIcon,
        usage: "Italic",
      },
      {
        name: "UnderlineIcon",
        Icon: Editor.UnderlineIcon,
        replaced: Lucide.UnderlineIcon,
        usage: "Underline",
      },
      {
        name: "StrikethroughIcon",
        Icon: Editor.StrikethroughIcon,
        replaced: Lucide.StrikethroughIcon,
        usage: "Strikethrough",
      },
      {
        name: "Heading1Icon",
        Icon: Editor.Heading1Icon,
        replaced: Lucide.Heading1Icon,
        usage: "Heading 1",
      },
      {
        name: "Heading2Icon",
        Icon: Editor.Heading2Icon,
        replaced: Lucide.Heading2Icon,
        usage: "Heading 2",
      },
      {
        name: "Heading3Icon",
        Icon: Editor.Heading3Icon,
        replaced: Lucide.Heading3Icon,
        usage: "Heading 3",
      },
      {
        name: "ListIcon",
        Icon: Editor.ListIcon,
        replaced: Lucide.ListIcon,
        usage: "Bulleted list",
      },
      {
        name: "ListOrderedIcon",
        Icon: Editor.ListOrderedIcon,
        replaced: Lucide.ListOrderedIcon,
        usage: "Numbered list",
      },
      {
        name: "QuoteIcon",
        Icon: Editor.QuoteIcon,
        replaced: Lucide.QuoteIcon,
        usage: "Quote",
      },
      {
        name: "SquareCodeIcon",
        Icon: Editor.SquareCodeIcon,
        replaced: Lucide.SquareCodeIcon,
        usage: "Code block",
      },
      {
        name: "LinkIcon",
        Icon: Navigation.LinkIcon,
        replaced: Lucide.LinkIcon,
        usage: "Insert or copy a link",
      },
      {
        name: "ExternalLinkIcon",
        Icon: Navigation.ExternalLinkIcon,
        replaced: Lucide.ExternalLinkIcon,
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
        replaced: Lucide.FlaskConicalIcon,
        usage: "Test, automation library",
      },
      {
        name: "BookMarkedIcon",
        Icon: Metadata.BookMarkedIcon,
        replaced: Lucide.BookMarkedIcon,
        usage: "Story",
      },
      {
        name: "PlayIcon",
        Icon: Metadata.PlayIcon,
        replaced: Lucide.PlayIcon,
        usage: "Story play function",
      },
      {
        name: "ComponentIcon",
        Icon: Metadata.ComponentIcon,
        replaced: Lucide.ComponentIcon,
        usage: "Components impacted",
      },
      {
        name: "BugPlayIcon",
        Icon: Metadata.BugPlayIcon,
        replaced: Lucide.BugPlayIcon,
        usage: "Playwright trace",
      },
      {
        name: "TagIcon",
        Icon: Metadata.TagIcon,
        replaced: Lucide.TagIcon,
        usage: "Tags",
      },
      {
        name: "TargetIcon",
        Icon: Metadata.TargetIcon,
        replaced: Lucide.TargetIcon,
        usage: "Diff threshold",
      },
      {
        name: "SlidersHorizontalIcon",
        Icon: Metadata.SlidersHorizontalIcon,
        replaced: Lucide.SlidersHorizontalIcon,
        usage: "Variants",
      },
      {
        name: "RepeatIcon",
        Icon: Navigation.RepeatIcon,
        replaced: Lucide.RepeatIcon,
        usage: "Repeated test",
      },
      {
        name: "RotateCcwIcon",
        Icon: Navigation.RotateCcwIcon,
        replaced: Lucide.RotateCcwIcon,
        usage: "Retried test, retried failures",
      },
      {
        name: "GlobeIcon",
        Icon: Metadata.GlobeIcon,
        replaced: Lucide.GlobeIcon,
        usage: "URL, browser",
      },
      {
        name: "CloudDownloadIcon",
        Icon: Metadata.CloudDownloadIcon,
        replaced: Lucide.CloudDownloadIcon,
        usage: "SDK update available",
      },
      {
        name: "PackageXIcon",
        Icon: Metadata.PackageXIcon,
        replaced: Lucide.PackageXIcon,
        usage: "Unsupported SDK",
      },
      {
        name: "ScanEyeIcon",
        Icon: Viewer.ScanEyeIcon,
        replaced: Lucide.ScanEyeIcon,
        usage: "Screenshots to review",
      },
      {
        name: "ImagePlusIcon",
        Icon: Content.ImagePlusIcon,
        replaced: Lucide.ImagePlusIcon,
        usage: "Screenshots added",
      },
      {
        name: "ImageMinusIcon",
        Icon: Content.ImageMinusIcon,
        replaced: Lucide.ImageMinusIcon,
        usage: "Screenshots removed",
      },
      {
        name: "ImagesIcon",
        Icon: Content.ImagesIcon,
        replaced: Lucide.ImagesIcon,
        usage: "Screenshot list, empty state",
      },
      {
        name: "FileIcon",
        Icon: Content.FileIcon,
        replaced: Lucide.FileIcon,
        usage: "Non-image snapshot",
      },
      {
        name: "FileUpIcon",
        Icon: Content.FileUpIcon,
        replaced: Lucide.FileUpIcon,
        usage: "Build uploaded",
      },
      {
        name: "GaugeIcon",
        Icon: Metadata.GaugeIcon,
        replaced: Lucide.GaugeIcon,
        usage: "Change summary",
      },
      {
        name: "RadarIcon",
        Icon: Metadata.RadarIcon,
        replaced: Lucide.RadarIcon,
        usage: "Impact analysis",
      },
      {
        name: "LightbulbIcon",
        Icon: Metadata.LightbulbIcon,
        replaced: OcticonLightBulbIcon,
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
        replaced: Lucide.MonitorSmartphoneIcon,
        usage: "Viewports",
      },
      {
        name: "MonitorIcon",
        Icon: Metadata.MonitorIcon,
        replaced: Lucide.MonitorIcon,
        usage: "Desktop, system theme",
      },
      {
        name: "LaptopIcon",
        Icon: Metadata.LaptopIcon,
        replaced: Lucide.LaptopIcon,
        usage: "Laptop viewport",
      },
      {
        name: "TabletIcon",
        Icon: Metadata.TabletIcon,
        replaced: Lucide.TabletIcon,
        usage: "Tablet viewport",
      },
      {
        name: "SmartphoneIcon",
        Icon: Metadata.SmartphoneIcon,
        replaced: Lucide.SmartphoneIcon,
        usage: "Mobile viewport",
      },
      {
        name: "PrinterIcon",
        Icon: Metadata.PrinterIcon,
        replaced: Lucide.PrinterIcon,
        usage: "Print media",
      },
      {
        name: "SunMoonIcon",
        Icon: Metadata.SunMoonIcon,
        replaced: Lucide.SunMoonIcon,
        usage: "Color schemes",
      },
      {
        name: "SunIcon",
        Icon: Metadata.SunIcon,
        replaced: Lucide.SunIcon,
        usage: "Light scheme",
      },
      {
        name: "MoonIcon",
        Icon: Metadata.MoonIcon,
        replaced: Lucide.MoonIcon,
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
        replaced: Lucide.GitBranchIcon,
        usage: "Branch",
      },
      {
        name: "GitCompareArrowsIcon",
        Icon: Git.GitCompareArrowsIcon,
        replaced: Lucide.GitCompareArrowsIcon,
        usage: "Baseline",
      },
      {
        name: "GitPullRequestIcon",
        Icon: Git.GitPullRequestIcon,
        replaced: Lucide.GitPullRequestIcon,
        usage: "CI mode",
      },
      {
        name: "GitPullRequestIcon",
        Icon: Git.GitPullRequestIcon,
        replaced: OcticonGitPullRequestIcon,
        usage: "Open pull request (was an Octicon)",
      },
      {
        name: "GitPullRequestDraftIcon",
        Icon: Git.GitPullRequestDraftIcon,
        replaced: OcticonGitPullRequestDraftIcon,
        usage: "Draft pull request (was an Octicon)",
      },
      {
        name: "GitPullRequestClosedIcon",
        Icon: Git.GitPullRequestClosedIcon,
        replaced: OcticonGitPullRequestClosedIcon,
        usage: "Closed pull request (was an Octicon)",
      },
      {
        name: "GitMergeIcon",
        Icon: Git.GitMergeIcon,
        replaced: OcticonGitMergeIcon,
        usage: "Merged pull request (was an Octicon)",
      },
      {
        name: "TowerControlIcon",
        Icon: Chrome.TowerControlIcon,
        replaced: Lucide.TowerControlIcon,
        usage: "Monitoring mode",
      },
      {
        name: "SquareStackIcon",
        Icon: Content.SquareStackIcon,
        replaced: Lucide.SquareStackIcon,
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
        replaced: Lucide.ChevronDownIcon,
        usage: "Expand, menus",
      },
      {
        name: "ChevronUpIcon",
        Icon: Navigation.ChevronUpIcon,
        replaced: Lucide.ChevronUpIcon,
        usage: "Collapse",
      },
      {
        name: "ChevronLeftIcon",
        Icon: Navigation.ChevronLeftIcon,
        replaced: Lucide.ChevronLeftIcon,
        usage: "Previous change",
      },
      {
        name: "ChevronRightIcon",
        Icon: Navigation.ChevronRightIcon,
        replaced: Lucide.ChevronRightIcon,
        usage: "Next change, journey",
      },
      {
        name: "ChevronsUpDownIcon",
        Icon: Navigation.ChevronsUpDownIcon,
        replaced: Lucide.ChevronsUpDownIcon,
        usage: "Expand a thread, select",
      },
      {
        name: "ChevronsDownUpIcon",
        Icon: Navigation.ChevronsDownUpIcon,
        replaced: Lucide.ChevronsDownUpIcon,
        usage: "Collapse a thread",
      },
      {
        name: "ArrowDownIcon",
        Icon: Navigation.ArrowDownIcon,
        replaced: Lucide.ArrowDownIcon,
        usage: "Next screenshot, sort",
      },
      {
        name: "ArrowUpDownIcon",
        Icon: Navigation.ArrowUpDownIcon,
        replaced: Lucide.ArrowUpDownIcon,
        usage: "Sort",
      },
      {
        name: "CornerDownRightIcon",
        Icon: Navigation.CornerDownRightIcon,
        replaced: Lucide.CornerDownRightIcon,
        usage: "Nested screenshot",
      },
      {
        name: "XIcon",
        Icon: Navigation.XIcon,
        replaced: Lucide.XIcon,
        usage: "Close, clear",
      },
      {
        name: "CheckIcon",
        Icon: Navigation.CheckIcon,
        replaced: Lucide.CheckIcon,
        usage: "Selected, copied, checkbox",
      },
      {
        name: "EllipsisIcon",
        Icon: Navigation.EllipsisIcon,
        replaced: Lucide.EllipsisIcon,
        usage: "More actions",
      },
      {
        name: "SearchIcon",
        Icon: Navigation.SearchIcon,
        replaced: Lucide.SearchIcon,
        usage: "Search screenshots, shortcuts",
      },
      {
        name: "FunnelIcon",
        Icon: Chrome.FunnelIcon,
        replaced: Lucide.FunnelIcon,
        usage: "Filters",
      },
      {
        name: "FunnelPlusIcon",
        Icon: Chrome.FunnelPlusIcon,
        replaced: Lucide.FunnelPlusIcon,
        usage: "Filter by this value",
      },
      {
        name: "FunnelXIcon",
        Icon: Chrome.FunnelXIcon,
        replaced: Lucide.FunnelXIcon,
        usage: "Exclude this value",
      },
      {
        name: "PanelRightIcon",
        Icon: Navigation.PanelRightIcon,
        replaced: Lucide.PanelRightIcon,
        usage: "Toggle the sidebar",
      },
      {
        name: "HouseIcon",
        Icon: Navigation.HouseIcon,
        replaced: Lucide.HouseIcon,
        usage: "Build overview",
      },
      {
        name: "WaypointsIcon",
        Icon: Chrome.WaypointsIcon,
        replaced: Lucide.WaypointsIcon,
        usage: "Screenshot journey",
      },
      {
        name: "HistoryIcon",
        Icon: Navigation.HistoryIcon,
        replaced: Lucide.HistoryIcon,
        usage: "Newer build available",
      },
      {
        name: "RefreshCcwIcon",
        Icon: Navigation.RefreshCcwIcon,
        replaced: Lucide.RefreshCcwIcon,
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
        replaced: Lucide.SettingsIcon,
        usage: "Settings",
      },
      {
        name: "SquareActivityIcon",
        Icon: Chrome.SquareActivityIcon,
        replaced: Lucide.SquareActivityIcon,
        usage: "Status page",
      },
      {
        name: "FileTextIcon",
        Icon: Content.FileTextIcon,
        replaced: Lucide.FileTextIcon,
        usage: "Documentation",
      },
      {
        name: "CommandIcon",
        Icon: Chrome.CommandIcon,
        replaced: Lucide.CommandIcon,
        usage: "Keyboard shortcuts",
      },
      {
        name: "TerminalIcon",
        Icon: Chrome.TerminalIcon,
        replaced: Lucide.TerminalIcon,
        usage: "Argos CLI",
      },
      {
        name: "BotIcon",
        Icon: Chrome.BotIcon,
        replaced: Lucide.BotIcon,
        usage: "Agent and bot authors",
      },
      {
        name: "LogOutIcon",
        Icon: Chrome.LogOutIcon,
        replaced: Lucide.LogOutIcon,
        usage: "Log out",
      },
    ],
  },
];
