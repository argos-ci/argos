import type { ScreenPoint } from "@/containers/Build/projection";

/**
 * The outline of an area a comment is about, drawn over the image between two
 * in-pane corners. The white ring keeps it readable over a dark screenshot.
 */
export function CommentArea(props: {
  topLeft: ScreenPoint;
  bottomRight: ScreenPoint;
}) {
  const { topLeft, bottomRight } = props;
  return (
    <div
      aria-hidden
      style={{
        left: topLeft.left,
        top: topLeft.top,
        width: bottomRight.left - topLeft.left,
        height: bottomRight.top - topLeft.top,
      }}
      className="border-primary-active bg-primary-solid/10 pointer-events-none absolute rounded-xs border-2 ring-1 ring-white/60"
    />
  );
}
