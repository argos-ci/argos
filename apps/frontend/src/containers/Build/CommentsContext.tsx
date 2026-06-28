import { createContext } from "react";

/**
 * Whether comments are available in the current diff viewer — the toolbar's
 * comment tool and visibility toggle, the point comments on images, and the
 * line comments on text diffs.
 *
 * Comments belong to a build review, so views that reuse the diff viewer
 * outside of a build review (e.g. the test trends page) provide `false` to hide
 * them entirely. Defaults to `true` for the build review itself.
 */
export const CommentsEnabledContext = createContext<boolean>(true);
