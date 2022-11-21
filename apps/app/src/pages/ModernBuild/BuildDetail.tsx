import { Code } from "@/modern/ui/Code";
import { Time } from "@/modern/ui/Time";
import { memo, useLayoutEffect, useRef, useState } from "react";
import {
  BuildDiffVisibleStateProvider,
  useBuildDiffVisibleState,
} from "./BuildDiffVisibleState";
import { BuildDetailToolbar } from "./BuildDetailToolbar";
import { Diff, useBuildDiffState } from "./BuildDiffState";
import {
  BuildDiffFitStateProvider,
  useBuildDiffFitState,
} from "./BuildDiffFitState";
import { useScrollListener } from "@/modern/ui/useScrollListener";
import { getGroupIcon } from "./BuildDiffGroup";
import { FragmentType, graphql, useFragment, DocumentType } from "@/gql";

export const BuildFragment = graphql(`
  fragment BuildDetail_Build on Build {
    baseScreenshotBucket {
      branch
      createdAt
    }
    compareScreenshotBucket {
      branch
      createdAt
    }
  }
`);

type BuildFragmentDocument = DocumentType<typeof BuildFragment>;

const BuildScreenshotHeader = memo(
  ({
    label,
    branch,
    date,
  }: {
    label: string;
    branch: string;
    date: string;
  }) => {
    return (
      <div className="flex flex-shrink-0 flex-col items-center gap-0.5 text-on-light">
        <div className="flex items-center gap-1">
          <div className="text-xs font-medium">{label} from</div>
          <Code>{branch}</Code>
        </div>
        <Time date={date} className="text-xxs" />
      </div>
    );
  }
);

const MissingScreenshotInfo = memo(
  ({
    title,
    description,
    icon,
  }: {
    title: React.ReactNode;
    description: React.ReactNode;
    icon: React.ReactNode;
  }) => {
    return (
      <div className="w-full">
        <div className="text-s flex flex-col items-center gap-4 rounded bg-slate-900 p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="[&>*]:h-10 [&>*]:w-10">{icon}</div>
            <div className="text-base font-medium">{title}</div>
          </div>
          <p className="text-sm text-on-light">{description}</p>
        </div>
      </div>
    );
  }
);

const getImgAttributes = (url: string) => {
  return {
    key: url,
    src: url,
  };
};

const NeutralLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a href={href} rel="noopener noreferrer" target="_blank">
    {children}
  </a>
);

const BaseScreenshot = ({ diff }: { diff: Diff }) => {
  switch (diff.status) {
    case "added":
      return (
        <MissingScreenshotInfo
          title="New screenshot"
          description={
            <>
              This screenshot was added in this build that&quot;s why it
              doesn&quot;t have a baseline to compare with.
            </>
          }
          icon={getGroupIcon("added")}
        />
      );
    case "failed":
      return (
        <MissingScreenshotInfo
          title="Failure screenshot"
          description={
            <>
              A failure screenshot has no baseline to compare with. A screenshot
              is automatically categorized as a failure when its name contained
              the string &quot;(failed)&quot;.
            </>
          }
          icon={getGroupIcon("failure")}
        />
      );
    case "stable":
    case "removed":
      return (
        <div>
          <NeutralLink href={diff.baseScreenshot!.url}>
            <img
              className="max-h-full"
              alt="Baseline screenshot"
              {...getImgAttributes(diff.baseScreenshot!.url)}
            />
          </NeutralLink>
        </div>
      );
    case "updated":
      return (
        <div className="relative">
          <NeutralLink href={diff.baseScreenshot!.url}>
            <img
              className="relative max-h-full opacity-0"
              {...getImgAttributes(diff.url!)}
            />
            <img
              className="absolute top-0 left-0"
              alt="Baseline screenshot"
              {...getImgAttributes(diff.baseScreenshot!.url)}
            />
          </NeutralLink>
        </div>
      );
    default:
      return null;
  }
};

const CompareScreenshot = ({ diff }: { diff: Diff }) => {
  const { visible } = useBuildDiffVisibleState();
  const opacity = visible ? "" : "opacity-0";
  switch (diff.status) {
    case "added":
      return (
        <div>
          <NeutralLink href={diff.compareScreenshot!.url}>
            <img
              className="max-h-full"
              alt="Changes screenshot"
              {...getImgAttributes(diff.compareScreenshot!.url)}
            />
          </NeutralLink>
        </div>
      );
    case "failed":
      return (
        <div>
          <NeutralLink href={diff.compareScreenshot!.url}>
            <img
              className="max-h-full"
              alt="Failure screenshot"
              {...getImgAttributes(diff.compareScreenshot!.url)}
            />
          </NeutralLink>
        </div>
      );
    case "stable":
      return (
        <MissingScreenshotInfo
          title="Unchanged screenshot"
          description={
            <>
              All good! This screenshot is similar to the baseline screenshot.
            </>
          }
          icon={getGroupIcon("unchanged")}
        />
      );
    case "removed":
      return (
        <MissingScreenshotInfo
          title="Removed screenshot"
          description={
            <>
              This screenshot was removed in this build that&quot;s why it has
              no changes to compare with.
            </>
          }
          icon={getGroupIcon("removed")}
        />
      );
    case "updated":
      return (
        <div className="relative">
          <NeutralLink href={diff.compareScreenshot!.url}>
            <img
              className="absolute"
              {...getImgAttributes(diff.compareScreenshot!.url)}
            />
            <div
              className={`${opacity} absolute inset-0 bg-black bg-opacity-70`}
            />
            <img
              className={`${opacity} relative z-10 max-h-full`}
              alt="Changes screenshot"
              {...getImgAttributes(diff.url!)}
            />
          </NeutralLink>
        </div>
      );
    default:
      return null;
  }
};

const BuildScreenshots = memo(
  (props: { diff: Diff; build: BuildFragmentDocument }) => {
    const { contained } = useBuildDiffFitState();
    const flex = contained ? "flex-1 min-h-0" : "";
    return (
      <div className={`${flex} flex gap-4 px-4`}>
        {props.build.baseScreenshotBucket ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <BuildScreenshotHeader
              label="Baseline"
              branch={props.build.baseScreenshotBucket.branch}
              date={props.build.baseScreenshotBucket.createdAt}
            />
            <div className="flex min-h-0 flex-1 justify-center">
              <BaseScreenshot diff={props.diff} />
            </div>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <BuildScreenshotHeader
            label="Changes"
            branch={props.build.compareScreenshotBucket.branch}
            date={props.build.compareScreenshotBucket.createdAt}
          />
          <div className="flex min-h-0 flex-1 justify-center">
            <CompareScreenshot diff={props.diff} />
          </div>
        </div>
      </div>
    );
  }
);

const useScrollToTop = (
  ref: React.RefObject<HTMLElement>,
  activeDiff: Diff | null
) => {
  useLayoutEffect(() => {
    if (activeDiff && ref.current) {
      ref.current.scroll({
        top: 0,
      });
    }
  }, [ref, activeDiff]);
};

export const BuildDetail = (props: {
  build: FragmentType<typeof BuildFragment>;
}) => {
  const build = useFragment(BuildFragment, props.build);
  const { activeDiff } = useBuildDiffState();
  const containerRef = useRef<HTMLDivElement>(null);
  useScrollToTop(containerRef, activeDiff);
  const [scrolled, setScrolled] = useState(false);
  useScrollListener((event) => {
    setScrolled(
      event.target ? (event.target as HTMLDivElement).scrollTop > 0 : false
    );
  }, containerRef);
  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4"
    >
      {activeDiff ? (
        <BuildDiffVisibleStateProvider>
          <BuildDiffFitStateProvider>
            <BuildDetailToolbar name={activeDiff.name} bordered={scrolled} />
            <BuildScreenshots build={build} diff={activeDiff} />
          </BuildDiffFitStateProvider>
        </BuildDiffVisibleStateProvider>
      ) : null}
    </div>
  );
};
