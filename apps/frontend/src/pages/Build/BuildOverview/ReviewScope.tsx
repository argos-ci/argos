import { clsx } from "clsx";
import { ComponentIcon, ImagesIcon, SparklesIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Kbd } from "@/ui/Kbd";

import { SectionHeader, Stat } from "./shared";

const _BuildFragment = graphql(`
  fragment ReviewScope_Build on Build {
    impactAnalysis {
      uniqueChangeCount
      affectedComponents {
        name
        count
      }
      affectedTests {
        name
        count
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

type ReviewDifficulty = {
  label: string;
  timeEstimate: string;
  bars: number;
};

/** Rough review effort derived from the number of unique visual changes. */
function getReviewDifficulty(uniqueChangeCount: number): ReviewDifficulty {
  if (uniqueChangeCount <= 3) {
    return { label: "Quick review", timeEstimate: "< 2 min", bars: 1 };
  }
  if (uniqueChangeCount <= 15) {
    return { label: "Medium review", timeEstimate: "2–5 min", bars: 2 };
  }
  if (uniqueChangeCount <= 40) {
    return { label: "Heavy review", timeEstimate: "5–15 min", bars: 3 };
  }
  if (uniqueChangeCount <= 80) {
    return { label: "Large review", timeEstimate: "15–30 min", bars: 4 };
  }
  return { label: "Extensive review", timeEstimate: "30+ min", bars: 5 };
}

function DifficultyBars(props: { filled: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "h-1.5 w-4 rounded-full",
            i < props.filled ? "bg-primary-solid" : "bg-primary-hover",
          )}
        />
      ))}
    </div>
  );
}

/** A review-scope metric, separated from its neighbour by a vertical rule. */
function ScopeStat(props: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: React.ReactNode;
  label: string;
}) {
  return <Stat {...props} className="border-l-thin px-3 pl-5" />;
}

/**
 * Summary of what reviewing this build entails — estimated effort plus the key
 * counts (screenshots, unique changes, affected entities) — with the call to
 * action to start the review.
 */
export function ReviewScope(props: {
  build: Build;
  isDisabled: boolean;
  onStart: () => void;
}) {
  const { build, isDisabled, onStart } = props;
  const analysis = build.impactAnalysis;
  const componentCount = analysis?.affectedComponents.length ?? 0;
  const testCount = analysis?.affectedTests.length ?? 0;
  const affectedCount = componentCount > 0 ? componentCount : testCount;
  const affectedLabel =
    componentCount > 0 ? "Affected components" : "Affected tests";
  const difficulty = analysis
    ? getReviewDifficulty(analysis.uniqueChangeCount)
    : null;
  return (
    <div className="bg-primary-ui border-thin mt-6 rounded-lg p-5">
      <div className="flex">
        {difficulty && (
          <div className="flex shrink-0 flex-col gap-2 pr-6">
            <SectionHeader noMargin>Review scope</SectionHeader>
            <span className="text-primary-low bg-primary-hover mt-3 rounded-sm px-3 py-2 text-xs font-bold">
              {difficulty.label} · {difficulty.timeEstimate}
            </span>
            <DifficultyBars filled={difficulty.bars} />
          </div>
        )}

        {analysis && (
          <div className="flex flex-1 items-start overflow-x-auto">
            <ScopeStat
              icon={ImagesIcon}
              value={analysis.changedCount}
              label="Screenshots"
            />
            {analysis.uniqueChangeCount > 0 ? (
              <ScopeStat
                icon={SparklesIcon}
                value={analysis.uniqueChangeCount}
                label="Unique changes"
              />
            ) : null}
            {affectedCount > 0 ? (
              <ScopeStat
                icon={ComponentIcon}
                value={affectedCount}
                label={affectedLabel}
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button autoFocus isDisabled={isDisabled} onPress={onStart}>
          Start review
          <Kbd className="ml-2 bg-white/25 text-white">↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
