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

export function useOverlayStyle(props: { src: string }) {
  const color = useAtomValue(overlayColorAtom);
  const opacity = useAtomValue(overlayOpacityAtom);
  return {
    background: color,
    maskImage: `url(${props.src})`,
    maskSize: "100%",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    display: "inline-block",
    opacity,
  };
}
