/**
 * The Argos icon language: every icon the build page draws, redrawn so the
 * page reads as one product rather than a stock set.
 *
 * The chassis is Lucide's — 24px grid, 2px stroke, round caps and joins,
 * `currentColor` — and each icon is built with `createLucideIcon` under the
 * name (and aliases) of the Lucide icon it replaced. It takes the same props
 * and renders the same `lucide-<name>` classes, which Playwright locates
 * icon-only buttons by: keep the name when redrawing one.
 *
 * Import icons from `@/ui/argos-icons`. A new one belongs to the family file
 * it fits, follows the rules below, and gets an entry in `catalog.ts` so it
 * shows up in Storybook.
 *
 * What makes them Argos:
 *
 * - **Ink and tint.** The subject of an icon — the bubble, the frame, the
 *   badge, the lens — is washed with its own color at 20%. Whatever acts on
 *   the subject (a check, an arrow, a plus) stays bare ink. The wash follows
 *   `currentColor`, so a green status icon gets a green wash, in both themes.
 * - **Soft frames.** Rectangles that stand for a screen, an image or a
 *   document round their corners at 3, not Lucide's 2 — the softness of the
 *   logo's eye. Shapes narrower than 12 keep 2, or they turn into pills.
 * - **The eye.** Argos is the hundred-eyed watchman and the logo is an almond
 *   eye, so every icon about seeing uses that almond — pointed corners, a
 *   solid pupil — rather than a round lens. Aim and focus reuse the pupil.
 * - **Absence is a ghost.** Something switched off or held back is drawn
 *   dashed and without its wash, the convention the comparison viewer's
 *   view-mode icons started, rather than struck through with a slash.
 */

/** The wash on an icon's subject. Stroke and fill share one element. */
export const TINT = { fill: "currentColor", fillOpacity: 0.2 } as const;

/** The wash alone, for a region with no outline of its own. */
export const TINT_ONLY = { ...TINT, stroke: "none" } as const;

/**
 * A ghosted outline. Round caps add a stroke width to every dash, so `2 4`
 * reads as 4 units of ink and 2 of gap — coarse enough that the gaps survive
 * at the 16px buttons render icons at.
 */
export const GHOST = { strokeDasharray: "2 4" } as const;

/** The corner radius of a frame: a screen, an image, a document, a panel. */
export const FRAME_RADIUS = "3";

/**
 * The logo's eye, 20 wide and 12 tall: two arcs meeting in points, with the
 * same 53° corners as the mark.
 */
export const EYE = "M2 12C5 8 8 6 12 6s7 2 10 6c-3 4-6 6-10 6s-7-2-10-6z";

/** A solid pupil, 6 across once stroked: still a dot at 16px. */
export const PUPIL = { cx: "12", cy: "12", r: "2", fill: "currentColor" };

/** The badge every status sits in. */
export const STATUS_RING = { cx: "12", cy: "12", r: "10", ...TINT };

/**
 * A comment: an 18×14 bubble with its tail at the bottom left. Its body is
 * centered on (12, 10), where marks inside it sit.
 */
export const BUBBLE =
  "M21 14a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z";

/** A document with its corner folded, and the fold. */
export const FILE =
  "M7 22a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h7l6 6v11a3 3 0 0 1-3 3z";
export const FILE_FOLD = "M14 2v4a2 2 0 0 0 2 2h4";

/** A full-size frame: an image, a square button, a window. */
export const FRAME = {
  x: "3",
  y: "3",
  width: "18",
  height: "18",
  rx: FRAME_RADIUS,
} as const;
