import { createContext, use, useMemo } from "react";
import { invariant } from "@argos/util/invariant";

import { useStorageState } from "@/util/useStorageState";

type DiffColorContextValue = {
  color: string;
  setColor: React.Dispatch<React.SetStateAction<string>>;
  opacity: number;
  setOpacity: React.Dispatch<React.SetStateAction<number>>;
};

const DiffColorContext = createContext<DiffColorContextValue | null>(null);

export function useBuildDiffColorState() {
  const context = use(DiffColorContext);
  invariant(
    context,
    "useBuildDiffColorState must be used within a BuildDiffColorStateProvider",
  );
  return context;
}

export function useBuildDiffColorStyle(props: { src: string }) {
  const { color, opacity } = useBuildDiffColorState();
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

export function BuildDiffColorStateProvider(props: {
  children: React.ReactNode;
}) {
  const [color, setColor] = useStorageState(
    "preferences.overlay.color",
    "#FD3A4A",
  );
  const [opacity, setOpacity] = useStorageState(
    "preferences.overlay.opacity",
    0.8,
  );
  const value = useMemo<DiffColorContextValue>(
    () => ({ color, setColor, opacity, setOpacity }),
    [color, setColor, opacity, setOpacity],
  );
  return <DiffColorContext value={value}>{props.children}</DiffColorContext>;
}
