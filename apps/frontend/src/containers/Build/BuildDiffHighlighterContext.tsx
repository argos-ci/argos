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
  /**
   * Whether the changed areas are still being detected. A `null` highlighter
   * then means "the answer is not in yet" rather than "there is nothing to step
   * through", which is the difference between a control that is about to work
   * and one that never will.
   */
  loading: boolean;
  registerHighlighter: (highlighter: Highlighter) => () => void;
  setLoading: (loading: boolean) => void;
};

const BuildDiffHighlighterContext =
  createContext<BuildDiffHighlighterContextValue | null>(null);

export function BuildDiffHighlighterProvider(props: {
  children: React.ReactNode;
}) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [loading, setLoading] = useState(false);
  const registerHighlighter = useCallback((highlighter: Highlighter) => {
    setHighlighter(highlighter);
    return () => setHighlighter(null);
  }, []);
  const value = useMemo(
    () => ({ registerHighlighter, highlighter, loading, setLoading }),
    [registerHighlighter, highlighter, loading],
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
