import type { ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

/**
 * Story parameters for a story that renders an overlay open.
 *
 * Argos screenshots a story by cropping `<body>` to its content
 * (`fitToContent`, on by default). An open menu, dialog, popover or tooltip is
 * portalled and positioned out of flow, so it contributes nothing to that
 * measurement and lands outside the crop — which is why every closed-trigger
 * story photographs only the trigger. Opting out captures the full viewport
 * instead.
 */
export const openOverlayParameters = {
  argos: { fitToContent: false },
  // Pins the width only — the viewport addon is not installed, so nothing but
  // Argos reads this, and with fit-to-content off the height comes from the
  // full-page capture instead.
  viewport: { defaultViewport: 900 },
};

/**
 * The stage an open overlay is photographed on. `h-screen` makes `<body>`'s box
 * equal the viewport — the box a fixed-position overlay fills. Without it
 * `<body>` is only as tall as the trigger and the overlay is cropped off.
 *
 * Wrap each trigger in an `OverlaySlot` when a story opens more than one at
 * once: popups are positioned against their trigger and ignore each other, so
 * adjacent triggers overlap their popups and clip the one underneath.
 */
export function OverlayStage({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "flex h-screen w-full flex-wrap items-start justify-center gap-8 p-16",
        className,
      )}
    />
  );
}

/** Reserves enough width for one open popup to stand clear of its neighbours. */
export function OverlaySlot({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return <div {...props} className={clsx("w-64", className)} />;
}
