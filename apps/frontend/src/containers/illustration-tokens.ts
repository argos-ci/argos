/**
 * Colour tokens for the product illustrations.
 *
 * They share one visual language: neutral "surfaces" that read as product
 * chrome, violet for whatever the scene acts on, and one supporting hue per
 * scene. Every value is a Radix CSS variable, which the `.dark` class re-points
 * at the dark scale — so the illustrations follow the colour mode without a
 * second set of assets.
 */

export const SURFACE = "var(--gray-1)";
export const SURFACE_RAISED = "var(--gray-2)";
export const SURFACE_SUNKEN = "var(--gray-3)";
export const LINE = "var(--gray-6)";
export const LINE_SOFT = "var(--gray-4)";
export const CONTENT = "var(--gray-5)";
export const CONTENT_STRONG = "var(--gray-8)";
export const ACCENT = "var(--violet-9)";
export const ACCENT_DEEP = "var(--violet-10)";
export const ACCENT_SOFT = "var(--violet-3)";
export const ACCENT_MID = "var(--violet-5)";
export const ACCENT_LINE = "var(--violet-8)";
export const SUCCESS = "var(--grass-9)";
export const SUCCESS_SOFT = "var(--grass-4)";
export const WARNING = "var(--orange-9)";
