---
name: lucide-style-icons
description: Design original SVG icons that match the Lucide icon set used across the Argos frontend — grid, stroke and corner conventions, createLucideIcon wiring, Storybook documentation, 16px verification. Use when a concept has no fitting Lucide icon and needs a custom one, or when reviewing/adjusting the existing custom icons.
---

# Lucide-style custom icons

Custom icons live in `apps/frontend/src/ui/Icons.tsx` and are documented in
`apps/frontend/src/ui/Icons.stories.tsx`. Read both before adding one — new
icons should extend the metaphors already there, not invent parallel ones.

## First: prove Lucide doesn't have it

Search https://lucide.dev/icons/ (or grep the export list in
`node_modules/lucide-react/dist/lucide-react.d.ts`) for the concept **and its
synonyms**. Only draw a custom icon when nothing fits, and say in the icon's
JSDoc which Lucide icons it borrows from. A custom icon that duplicates a
Lucide drawing is a bug: it will drift from upstream refinements.

## Lucide's design language

- **Grid**: 24×24 viewBox. Keep strokes inside the 20×20 live area
  (coordinates 2–22); primary square shapes usually sit in 3–21. Center the
  composition optically — the bounding box of all strokes should be roughly
  centered.
- **Stroke only**: 2px stroke, round caps and joins, no fill. Color is
  `currentColor`. `createLucideIcon` applies all of this — never restate it.
- **Corners**: 2px radius. `rx="2"` on rects; mid-path either the arc
  `a2 2 0 0 1 -2 2` or the cubic `c-1 0-2-1-2-2` official icons use — both
  draw the same corner.
- **Coordinates**: snap to whole pixels. Sub-pixel values only when optical
  centering demands it (official icons use `.1`/`.9` in cubics, nothing
  finer).
- **Spacing**: keep ≥2px of clearance between separate elements so they don't
  fuse at small sizes. Strokes may touch or cross **only when the drawing
  means it** (a handle sitting on its line, two layers blending — see
  Lucide's `blend`).
- **Density**: at most ~5 elements. The app renders icons at 16px inside
  buttons (`*:size-4`); a detail thinner than ~2px of gap disappears there.
- **Metaphor before geometry**: decide what the icon *says* first, reusing
  Lucide's vocabulary — a rounded rect is a document/image, stacked offset
  frames are layers (front = bottom-right, back = top-left, as in `copy`),
  a dashed stroke is a ghost/absence.

## Icons that belong to one control

When several icons sit in the same button group, they are one drawing in
several states, not several drawings. Build them from **shared geometry
constants** and change only the ink — the set then reads as a single control,
and the eye compares the difference instead of re-reading each icon. The
comparison set in `Icons.tsx` does this: the same two panels every time, solid
for the side on screen and ghosted for the side held back.

## Ghosting a shape

To say "this part is not here", dash its outline with `strokeDasharray` rather
than drawing dash segments by hand. Lucide's own `*-dashed` icons place each
dash as its own path, which suits a full-size square but leaves a small shape
looking like scattered ticks with open corners.

Round caps eat the gaps: with the standard 2px stroke, a dash of `d` renders as
`d + 2` of ink and a gap of `g` as `g - 2` of space, so `"2 4"` reads as 4 units
of ink and 2 of gap. Pick the pattern **at 16px, not at 24px** — too fine a dash
closes up at button size and the ghosted shape becomes indistinguishable from a
solid one, which is the whole distinction the icon exists to make. Render the
candidates side by side at 48/24/16px and choose from that, rather than from the
numbers.

## Reusing official fragments

The fastest way to stay on-style is to build from official path data. Each
icon's source is readable at
`node_modules/lucide-react/dist/esm/icons/<kebab-name>.mjs` — copy fragments
from there (a half-frame from `square-split-horizontal`, the corner peek from
`copy`, the handle-on-line from `git-commit-vertical`, …) and recombine them.

## Implementation

```tsx
import { createLucideIcon } from "lucide-react";

/** What the drawing says, and which Lucide icons it borrows from. */
export const MyThingIcon = createLucideIcon("my-thing", [
  ["rect", { x: "3", y: "3", width: "12", height: "12", rx: "2", key: "back" }],
  ["path", { d: "M21 12v7a2 2 0 0 1-2 2h-7", key: "front-peek" }],
]);
```

- Name the icon after the **app concept** (`baseline-view`), kebab-case. The
  name becomes the `lucide-<name>` class on the `<svg>` — that class is how
  Playwright locates icon-only buttons (see CLAUDE.md), so treat it as API
  and don't rename casually.
- Every element needs a unique `key` (they render as a React list).
- The component accepts all Lucide props (`size`, `strokeWidth`,
  `className`, aria attributes) — no wrapper needed, it drops into `Button`
  like any Lucide icon.

## Document and validate

1. Add the icon to `Icons.stories.tsx`: at 24px with its name, at 16px, and
   inside a secondary `iconOnly` `Button` (with `aria-label`) next to the
   Lucide icons it will sit beside in the real toolbar.
2. Run Storybook (`pnpm run --filter @argos/frontend storybook`) and check:
   - legibility at 16px — squint test: is it still distinct from its
     neighbors in the set?
   - stroke weight looks identical to the adjacent Lucide originals;
   - nothing clips the viewBox edge; the icon doesn't look off-center;
   - both light and dark color schemes.
3. `pnpm run static-checks` before finishing, like any change.
