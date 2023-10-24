import { DownloadIcon } from "lucide-react";
import { clsx } from "clsx";
import { memo, useLayoutEffect, useRef, useState } from "react";

import { checkIsBuildEmpty } from "@/containers/Build";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Code } from "@/ui/Code";
import { IconButton } from "@/ui/IconButton";
import { Anchor } from "@/ui/Link";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useScrollListener } from "@/ui/useScrollListener";

import { BuildDetailToolbar } from "./BuildDetailToolbar";
import {
  BuildDiffFitStateProvider,
  useBuildDiffFitState,
} from "./BuildDiffFitState";
import { getGroupIcon } from "./BuildDiffGroup";
import { Diff, useBuildDiffState } from "./BuildDiffState";
import {
  BuildDiffVisibleStateProvider,
  useBuildDiffVisibleState,
} from "./BuildDiffVisibleState";
import { ZoomPane, ZoomerSyncProvider } from "./Zoomer";
import {
  BuildDiffViewModeStateProvider,
  useBuildDiffViewModeState,
} from "./useBuildDiffViewModeState";

export const BuildFragment = graphql(`
  fragment BuildDetail_Build on Build {
    stats {
      total
    }
    createdAt
    branch
    baseScreenshotBucket {
      branch
      createdAt
    }
    pullRequest {
      merged
    }
  }
`);

type BuildFragmentDocument = DocumentType<typeof BuildFragment>;

const DownloadScreenshotButton = memo(
  (props: { url: string; tooltip: string }) => {
    return (
      <Tooltip side="left" content={props.tooltip}>
        <IconButton variant="contained" asChild>
          <a
            href={`${props.url}?tr=orig-true&ik-attachment=true`}
            download
            rel="noopener noreferrer"
            target="_blank"
          >
            <DownloadIcon />
          </a>
        </IconButton>
      </Tooltip>
    );
  },
);

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
      <div className="flex shrink-0 flex-col items-center gap-0.5 text-low">
        <div className="flex max-w-full items-center gap-1">
          <div className="shrink-0 select-none text-xs font-medium">
            {label} from
          </div>
          <Code
            className="overflow-hidden text-ellipsis whitespace-nowrap"
            title={branch}
          >
            {branch}
          </Code>
        </div>
        <Time date={date} className="text-xxs" />
      </div>
    );
  },
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
        <div className="text-s flex flex-col items-center gap-4 rounded border bg-app p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="[&>*]:h-10 [&>*]:w-10">{icon}</div>
            <div className="text-base font-medium">{title}</div>
          </div>
          <p className="text-sm text-low">{description}</p>
        </div>
      </div>
    );
  },
);

const getImgAttributes = ({
  url,
  width,
  height,
}: {
  url: string;
  width?: number | null | undefined;
  height?: number | null | undefined;
}) => {
  return {
    key: url,
    src: `${url}?tr=lo-true`,
    style: { aspectRatio: width && height ? `${width}/${height}` : undefined },
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
  const { contained } = useBuildDiffFitState();
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
    case "failure":
      return (
        <MissingScreenshotInfo
          title="Failure screenshot"
          description={
            <>
              A failure screenshot has no baseline to compare with. A screenshot
              is detected as a failure when its name contains "-failed-" or end
              by "(failed)".
            </>
          }
          icon={getGroupIcon("failure")}
        />
      );
    case "unchanged":
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
        <ZoomPane
          controls={
            <DownloadScreenshotButton
              url={diff.baseScreenshot!.url}
              tooltip="Download baseline screenshot"
            />
          }
        >
          <img
            className={clsx(contained && "max-h-full")}
            alt="Baseline screenshot"
            {...getImgAttributes(diff.baseScreenshot!)}
          />
        </ZoomPane>
      );
    case "changed":
      return (
        <ZoomPane
          controls={
            <DownloadScreenshotButton
              url={diff.baseScreenshot!.url}
              tooltip="Download baseline screenshot"
            />
          }
        >
          <img
            className={clsx("relative opacity-0", contained && "max-h-full")}
            {...getImgAttributes({
              url: diff.url!,
              width: diff.width,
              height: diff.height,
            })}
          />
          <img
            className="absolute left-0 top-0"
            alt="Baseline screenshot"
            {...getImgAttributes(diff.baseScreenshot!)}
          />
        </ZoomPane>
      );
    default:
      return null;
  }
};

const CompareScreenshot = ({ diff }: { diff: Diff }) => {
  const { visible } = useBuildDiffVisibleState();
  const { contained } = useBuildDiffFitState();
  const opacity = visible ? "" : "opacity-0";
  switch (diff.status) {
    case "added":
      return (
        <ZoomPane
          controls={
            <DownloadScreenshotButton
              url={diff.compareScreenshot!.url}
              tooltip="Download changes screenshot"
            />
          }
        >
          <img
            className={clsx(contained && "max-h-full")}
            alt="Changes screenshot"
            {...getImgAttributes(diff.compareScreenshot!)}
          />
        </ZoomPane>
      );
    case "failure":
      return (
        <ZoomPane
          controls={
            <DownloadScreenshotButton
              url={diff.compareScreenshot!.url}
              tooltip="Download changes screenshot"
            />
          }
        >
          <img
            className={clsx(contained && "max-h-full")}
            alt="Failure screenshot"
            {...getImgAttributes(diff.compareScreenshot!)}
          />
        </ZoomPane>
      );
    case "unchanged":
      return (
        <ZoomPane
          controls={
            <DownloadScreenshotButton
              url={diff.compareScreenshot!.url}
              tooltip="Download changes screenshot"
            />
          }
        >
          <NeutralLink href={diff.compareScreenshot!.url}>
            <img
              className={clsx(contained && "max-h-full")}
              alt="Baseline screenshot"
              {...getImgAttributes(diff.compareScreenshot!)}
            />
          </NeutralLink>
        </ZoomPane>
      );
    case "removed":
      return (
        <MissingScreenshotInfo
          title="Removed screenshot"
          description={
            <>
              This screenshot was removed in this build that's why it has no
              changes to compare with.
            </>
          }
          icon={getGroupIcon("removed")}
        />
      );
    case "changed":
      return (
        <ZoomPane
          controls={
            <DownloadScreenshotButton
              url={diff.compareScreenshot!.url}
              tooltip="Download changes screenshot"
            />
          }
        >
          <img
            className={clsx("absolute", visible && "opacity-disabled")}
            {...getImgAttributes(diff.compareScreenshot!)}
          />
          <img
            className={clsx(
              opacity,
              "relative z-10",
              contained && "max-h-full",
            )}
            alt="Changes screenshot"
            {...getImgAttributes({
              url: diff.url!,
              width: diff.width,
              height: diff.height,
            })}
          />
        </ZoomPane>
      );
    default:
      return null;
  }
};

const BuildScreenshots = memo(
  (props: { diff: Diff; build: BuildFragmentDocument }) => {
    // const { contained } = useBuildDiffFitState();
    const { viewMode } = useBuildDiffViewModeState();
    const showBaseline = viewMode === "split" || viewMode === "baseline";
    const showChanges = viewMode === "split" || viewMode === "changes";

    return (
      <div className={clsx("min-h-0 flex-1", "flex gap-4 px-4")}>
        {props.build.baseScreenshotBucket ? (
          <div
            className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 [&[hidden]]:hidden"
            hidden={!showBaseline}
          >
            <BuildScreenshotHeader
              label="Baseline"
              branch={props.build.baseScreenshotBucket.branch}
              date={props.build.baseScreenshotBucket.createdAt}
            />
            <div className="relative flex min-h-0 flex-1 justify-center">
              <BaseScreenshot diff={props.diff} />
            </div>
          </div>
        ) : null}
        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 [&[hidden]]:hidden"
          hidden={!showChanges}
        >
          <BuildScreenshotHeader
            label="Changes"
            branch={props.build.branch}
            date={props.build.createdAt}
          />
          <div className="relative flex min-h-0 flex-1 justify-center">
            <CompareScreenshot diff={props.diff} />
          </div>
        </div>
      </div>
    );
  },
);

const useScrollToTop = (
  ref: React.RefObject<HTMLElement>,
  activeDiff: Diff | null,
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
  repoUrl: string | null;
}) => {
  const build = useFragment(BuildFragment, props.build);
  const { activeDiff } = useBuildDiffState();
  const containerRef = useRef<HTMLDivElement>(null);
  useScrollToTop(containerRef, activeDiff);
  const [scrolled, setScrolled] = useState(false);
  useScrollListener((event) => {
    setScrolled(
      event.target ? (event.target as HTMLDivElement).scrollTop > 0 : false,
    );
  }, containerRef);
  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-subtle pb-4"
    >
      {activeDiff ? (
        <ZoomerSyncProvider id={activeDiff.id}>
          <BuildDiffVisibleStateProvider>
            <BuildDiffFitStateProvider>
              <BuildDiffViewModeStateProvider>
                <BuildDetailToolbar
                  activeDiff={activeDiff}
                  repoUrl={props.repoUrl}
                  baseBranch={build.baseScreenshotBucket?.branch ?? null}
                  compareBranch={build.branch}
                  bordered={scrolled}
                  prMerged={build.pullRequest?.merged ?? false}
                />
                <BuildScreenshots build={build} diff={activeDiff} />
              </BuildDiffViewModeStateProvider>
            </BuildDiffFitStateProvider>
          </BuildDiffVisibleStateProvider>
        </ZoomerSyncProvider>
      ) : checkIsBuildEmpty(build) ? (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center">
          <div className="m-4 max-w-2xl rounded-lg border border-info bg-info-app p-8 text-center text-info-low">
            <div className="mb-2 text-lg font-semibold">
              No screenshot found
            </div>
            Be sure to specify a directory containing images in the upload
            command.
            <br />
            <Anchor
              external
              href="https://argos-ci.com/docs/argos-cli#upload-command"
            >
              See upload documentation
            </Anchor>
            .
          </div>
        </div>
      ) : null}
    </div>
  );
};
