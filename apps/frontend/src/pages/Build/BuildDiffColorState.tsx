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

export function useBuildDiffColorStyle(props: {
  height: number | string | null | undefined;
}) {
  const { color, opacity } = useBuildDiffColorState();
  if (!props.height) {
    return {};
  }
  const unitHeight =
    typeof props.height === "number" ? `${props.height}px` : props.height;
  return {
    filter: `drop-shadow(0 ${unitHeight} 0 ${color})`,
    transform: `translateY(-${unitHeight})`,
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
