import { createContext, useContext, useMemo } from "react";
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
  const context = useContext(DiffColorContext);
  invariant(
    context,
    "useBuildDiffColorState must be used within a BuildDiffColorStateProvider",
  );
  return context;
}

export function useBuildDiffColorStyle() {
  const { color, opacity } = useBuildDiffColorState();
  return {
    filter: `drop-shadow(0 2000px 0 ${color})`,
    transform: "translateY(-2000px)",
    overflow: "hidden",
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
  const value = useMemo(
    (): DiffColorContextValue => ({ color, setColor, opacity, setOpacity }),
    [color, setColor, opacity, setOpacity],
  );
  return (
    <DiffColorContext.Provider value={value}>
      {props.children}
    </DiffColorContext.Provider>
  );
}
