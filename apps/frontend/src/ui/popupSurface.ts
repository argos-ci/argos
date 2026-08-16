import { clsx } from "clsx";

/**
 * The surface a popup draws on — menus, selects, popovers and the emoji picker
 * all wear it.
 *
 * React Aria had a single `Popover` component that read its context from
 * whichever trigger wrapped it, so one component could serve every overlay.
 * Base UI gives each namespace its own `Portal`/`Positioner`/`Popup`, so the
 * thing they share is no longer a component — it is this class string.
 */
export const popupSurfaceClassName =
  "bg-app shadow-menu border-thin flex rounded-xl bg-clip-padding";

/**
 * Where the popup sits in the stack. This belongs on the **positioner**, not on
 * the surface: Base UI's popup is `position: static` inside a fixed positioner,
 * and `z-index` does nothing on a static element. React Aria's `Popover` was
 * both at once, which is why the class used to live with the surface.
 */
export const popupZIndexClassName = "z-popup";

/**
 * Grows out of the corner touching the trigger, and shrinks back into it.
 *
 * Base UI publishes `--transform-origin` on the popup for the side and
 * alignment it actually resolved to, which is what the hand-written
 * placement-to-origin map used to compute — including the end-aligned case,
 * where a menu used to zoom from its top centre, visibly detached from the
 * button that opened it.
 */
export const popupAnimationClassName = clsx(
  "origin-(--transform-origin) fill-mode-forwards",
  "data-open:animate-in data-open:fade-in data-open:zoom-in-95",
  "data-closed:animate-out data-closed:fade-out data-closed:zoom-out-95",
);

/**
 * The leaving half of that animation alone.
 *
 * A submenu never plays an entrance — it is part of a menu already on screen,
 * not a new surface arriving — but when the whole tree is dismissed it has to
 * leave with the tree, playing the same exit at the same moment, rather than
 * sit at full opacity while its parent fades and then blink out.
 */
export const popupExitAnimationClassName = clsx(
  "origin-(--transform-origin) fill-mode-forwards",
  "data-closed:animate-out data-closed:fade-out data-closed:zoom-out-95",
);
