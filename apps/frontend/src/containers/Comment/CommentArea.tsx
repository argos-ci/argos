import type { ScreenRect } from "@/containers/Build/projection";

/**
 * The outline of an area a comment is about, drawn over the image at its
 * in-pane position. The white ring keeps it readable over a dark screenshot.
 */
export function CommentArea(props: { rect: ScreenRect }) {
  return (
    <div
      aria-hidden
      style={props.rect}
      className="border-primary-active bg-primary-solid/10 pointer-events-none absolute rounded-xs border-2 ring-1 ring-white/60"
    />
  );
}
