import { useAtomValue } from "jotai/react";
import { atomWithStorage } from "jotai/utils";

export const overlayColorAtom = atomWithStorage(
  "preferences.overlay.color",
  "#FD3A4A",
);

export const overlayOpacityAtom = atomWithStorage(
  "preferences.overlay.opacity",
  0.8,
);

export const overlayVisibleAtom = atomWithStorage<boolean>(
  "preferences.overlay.visible",
  true,
);

export const layoutShiftVisibleAtom = atomWithStorage<boolean>(
  "preferences.overlay.layoutShift",
  true,
);

export function useOverlayStyle(props: {
  src: string;
  /**
   * An image the size of the mask to intersect it with: only the mask's pixels
   * under its opaque ones are painted.
   */
  clipUrl?: string | undefined;
}) {
  const { src, clipUrl } = props;
  const color = useAtomValue(overlayColorAtom);
  const opacity = useAtomValue(overlayOpacityAtom);
  return {
    background: color,
    maskImage: clipUrl ? `url(${src}), url("${clipUrl}")` : `url(${src})`,
    maskComposite: "intersect",
    maskSize: "100%",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    display: "block",
    opacity,
  };
}
