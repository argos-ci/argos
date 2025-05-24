import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { invariant } from "@argos/util/invariant";

export type Highlighter = {
  highlight: () => void;
  go(direction: -1 | 1): void;
};

type BuildDiffHighlighterContextValue = {
  highlighter: Highlighter | null;
  registerHighlighter: (highlighter: Highlighter) => () => void;
};

const BuildDiffHighlighterContext =
  createContext<BuildDiffHighlighterContextValue | null>(null);

export function BuildDiffHighlighterProvider(props: {
  children: React.ReactNode;
}) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const registerHighlighter = useCallback((highlighter: Highlighter) => {
    setHighlighter(highlighter);
    return () => setHighlighter(null);
  }, []);
  const value = useMemo(
    () => ({ registerHighlighter, highlighter }),
    [registerHighlighter, highlighter],
  );
  return (
    <BuildDiffHighlighterContext value={value}>
      {props.children}
    </BuildDiffHighlighterContext>
  );
}

export function useBuildDiffHighlighterContext() {
  const context = useContext(BuildDiffHighlighterContext);
  invariant(context);
  return context;
}
