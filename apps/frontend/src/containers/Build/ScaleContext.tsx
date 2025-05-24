import { createContext, use, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";

type ScaleContextType = [number, (scale: number) => void];

const ScaleContext = createContext<ScaleContextType | null>(null);

export function useScaleContext() {
  const ctx = use(ScaleContext);
  invariant(ctx, "Missing ScaleContext");
  return ctx;
}

export function ScaleProvider(props: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const value = useMemo(
    (): ScaleContextType => [scale, setScale],
    [scale, setScale],
  );
  return <ScaleContext value={value}>{props.children}</ScaleContext>;
}
