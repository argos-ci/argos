import { createLucideIcon } from "lucide-react";

import { TINT } from "./language";

/*
 * The review: the verdict a reviewer gives and how it travels. The thumbs are
 * the two most-pressed buttons in the product, so their whole hand is washed
 * and the cuff takes the frame radius.
 */

export const ThumbsUpIcon = createLucideIcon("thumbs-up", [
  [
    "path",
    {
      d: "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H5a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",
      ...TINT,
      key: "hand",
    },
  ],
  ["path", { d: "M7 10v12", key: "cuff" }],
]);

export const ThumbsDownIcon = createLucideIcon("thumbs-down", [
  [
    "path",
    {
      d: "M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H19a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z",
      ...TINT,
      key: "hand",
    },
  ],
  ["path", { d: "M17 14V2", key: "cuff" }],
]);

/** A spoken comment in the review timeline: round, unlike a pinned one. */
export const MessageCircleIcon = createLucideIcon("message-circle", [
  ["path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22z", ...TINT, key: "bubble" }],
]);

/** The envelope stays open at the corner the check sits in. */
export const MailCheckIcon = createLucideIcon("mail-check", [
  [
    "path",
    {
      d: "M22 13V7a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h7",
      ...TINT,
      key: "envelope",
    },
  ],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "flap" }],
  ["path", { d: "m16 19 2 2 4-4", key: "check" }],
]);
