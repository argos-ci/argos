import { createLucideIcon, type LucideIconNode } from "lucide-react";

import { GHOST, TINT } from "./language";

/*
 * Where a build comes from: branches, pull requests, the baseline it is
 * compared to. Commits are washed nodes; the lines between them stay bare.
 * The pull request states replace the Octicons the PR button used, so the
 * header no longer mixes two icon sets.
 */

const node = (cx: string, cy: string, key: string): LucideIconNode => [
  "circle",
  { cx, cy, r: "3", ...TINT, key },
];

export const GitBranchIcon = createLucideIcon("git-branch", [
  ["path", { d: "M15 6a9 9 0 0 0-9 9V3", key: "branch" }],
  node("18", "6", "head"),
  node("6", "18", "base"),
]);

/** The baseline a screenshot is compared to: two commits, swapping. */
export const GitCompareArrowsIcon = createLucideIcon("git-compare-arrows", [
  node("5", "6", "base"),
  ["path", { d: "M12 6h5a2 2 0 0 1 2 2v7", key: "to-head" }],
  ["path", { d: "m15 9-3-3 3-3", key: "to-head-arrow" }],
  node("19", "18", "head"),
  ["path", { d: "M12 18H7a2 2 0 0 1-2-2V9", key: "to-base" }],
  ["path", { d: "m9 15 3 3-3 3", key: "to-base-arrow" }],
]);

export const GitPullRequestIcon = createLucideIcon("git-pull-request", [
  node("18", "18", "head"),
  node("6", "6", "base"),
  ["path", { d: "M13 6h3a2 2 0 0 1 2 2v7", key: "change" }],
  ["path", { d: "M6 9v12", key: "trunk" }],
]);

/** A closed pull request: its head node struck out, the change unmerged. */
export const GitPullRequestClosedIcon = createLucideIcon(
  "git-pull-request-closed",
  [
    node("6", "6", "base"),
    ["path", { d: "M6 9v12", key: "trunk" }],
    ["path", { d: "m15.5 3.5 5 5", key: "x-a" }],
    ["path", { d: "m15.5 8.5 5-5", key: "x-b" }],
    ["path", { d: "M18 11.62V15", key: "change" }],
    node("18", "18", "head"),
  ],
);

/** A draft: the change is not drawn yet, only ghosted. */
export const GitPullRequestDraftIcon = createLucideIcon(
  "git-pull-request-draft",
  [
    node("18", "18", "head"),
    node("6", "6", "base"),
    ["path", { d: "M18 4v11", ...GHOST, key: "change" }],
    ["path", { d: "M6 9v12", key: "trunk" }],
  ],
);

export const GitMergeIcon = createLucideIcon("git-merge", [
  node("18", "18", "head"),
  node("6", "6", "base"),
  ["path", { d: "M6 21V9a9 9 0 0 0 9 9", key: "merge" }],
]);
