import { memo, useLayoutEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { DownloadIcon } from "lucide-react";

import { checkIsBuildEmpty } from "@/containers/Build";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Anchor } from "@/ui/Anchor";
import { Code } from "@/ui/Code";
import { IconButton } from "@/ui/IconButton";
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
import {
  BuildDiffViewModeStateProvider,
  useBuildDiffViewModeState,
} from "./useBuildDiffViewModeState";
import { ZoomerSyncProvider, ZoomPane } from "./Zoomer";

const BuildFragment = graphql(`
  fragment BuildDetail_Build on Build {
    id
    stats {
      total
    }
    createdAt
    branch
    type
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
  (props: { url: string; tooltip: string; name: string }) => {
    const downloadUrl = new URL(props.url);
    downloadUrl.searchParams.append("download", props.name);
    const [loading, setLoading] = useState(false);

    return (
      <Tooltip side="left" content={props.tooltip}>
        <IconButton
          variant="contained"
          disabled={loading}
          onClick={(event) => {
            event.preventDefault();
            setLoading(true);
            fetch(downloadUrl)
              .then((res) => res.blob())
              .then((blob) => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = props.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              })
              .finally(() => {
                setLoading(false);
              });
          }}
          asChild
        >
          <a
            href={downloadUrl.toString()}
            download={props.name}
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
      <div className="text-low flex shrink-0 flex-col items-center gap-0.5">
        <div className="flex max-w-full items-center gap-1">
          <div className="shrink-0 select-none text-xs font-medium">
            {label} from
          </div>
          <Code className="truncate" title={branch}>
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
        <div className="text-s bg-app flex flex-col items-center gap-4 rounded border p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="[&>*]:size-10">{icon}</div>
            <div className="text-base font-medium">{title}</div>
          </div>
          <p className="text-low text-sm">{description}</p>
        </div>
      </div>
    );
  },
);

function getAspectRatio({
  width,
  height,
}: {
  width?: number | null | undefined;
  height?: number | null | undefined;
}) {
  return width && height ? `${width}/${height}` : undefined;
}

function getImgAttributes({
  url,
  width,
  height,
}: {
  url: string;
  width?: number | null | undefined;
  height?: number | null | undefined;
}) {
  return {
    key: url,
    src: url,
    style: { aspectRatio: getAspectRatio({ width, height }) },
  };
}

function ScreenshotContainer({
  dimensions,
  contained,
  children,
}: {
  dimensions: {
    width?: number | null;
    height?: number | null;
  };
  contained: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "relative min-h-0 min-w-0",
        contained && "max-h-full max-w-full",
      )}
      style={
        contained
          ? {
              aspectRatio: getAspectRatio(dimensions),
              height: dimensions.height ?? undefined,
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

function DownloadBaseScreenshotButton({
  diff,
  buildId,
}: {
  diff: Diff;
  buildId: string;
}) {
  return (
    <DownloadScreenshotButton
      url={diff.baseScreenshot!.url}
      tooltip="Download baseline screenshot"
      name={`Build #${buildId} - ${diff.name} - baseline.png`}
    />
  );
}

const BaseScreenshot = ({ diff, buildId }: { diff: Diff; buildId: string }) => {
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
              is detected as a failure when its name ends by "(failed)".
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
            <DownloadBaseScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer
            dimensions={diff.baseScreenshot!}
            contained={contained}
          >
            <img
              className={clsx(contained && "max-h-full")}
              alt="Baseline screenshot"
              {...getImgAttributes(diff.baseScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    case "changed":
      return (
        <ZoomPane
          controls={
            <DownloadBaseScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={diff} contained={contained}>
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
          </ScreenshotContainer>
        </ZoomPane>
      );
    default:
      return null;
  }
};

function DownloadCompareScreenshotButton({
  diff,
  buildId,
}: {
  diff: Diff;
  buildId: string;
}) {
  return (
    <DownloadScreenshotButton
      url={diff.compareScreenshot!.url}
      tooltip="Download changes screenshot"
      name={`Build #${buildId} - ${diff.name} - new.png`}
    />
  );
}

const CompareScreenshot = ({
  diff,
  buildId,
}: {
  diff: Diff;
  buildId: string;
}) => {
  const { visible } = useBuildDiffVisibleState();
  const { contained } = useBuildDiffFitState();
  const opacity = visible ? "" : "opacity-0";
  switch (diff.status) {
    case "added":
      return (
        <ZoomPane
          controls={
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer
            dimensions={diff.compareScreenshot!}
            contained={contained}
          >
            <img
              className={clsx(contained && "max-h-full max-w-full")}
              alt="Changes screenshot"
              {...getImgAttributes(diff.compareScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    case "failure":
      return (
        <ZoomPane
          controls={
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer
            dimensions={diff.compareScreenshot!}
            contained={contained}
          >
            <img
              className={clsx(contained && "max-h-full")}
              alt="Failure screenshot"
              {...getImgAttributes(diff.compareScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    case "unchanged":
      return (
        <ZoomPane
          controls={
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer
            dimensions={diff.compareScreenshot!}
            contained={contained}
          >
            <img
              className={clsx(contained && "max-h-full")}
              alt="Baseline screenshot"
              {...getImgAttributes(diff.compareScreenshot!)}
            />
          </ScreenshotContainer>
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
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={diff} contained={contained}>
            <img
              className={clsx(
                "absolute left-0 top-0",
                visible && "opacity-disabled",
              )}
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
          </ScreenshotContainer>
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
              <BaseScreenshot diff={props.diff} buildId={props.build.id} />
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
            <CompareScreenshot diff={props.diff} buildId={props.build.id} />
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
      className="bg-subtle flex min-h-0 flex-1 flex-col overflow-y-auto pb-4"
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
                  buildType={build.type ?? null}
                />
                <BuildScreenshots build={build} diff={activeDiff} />
              </BuildDiffViewModeStateProvider>
            </BuildDiffFitStateProvider>
          </BuildDiffVisibleStateProvider>
        </ZoomerSyncProvider>
      ) : checkIsBuildEmpty(build) ? (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center">
          <div className="border-info bg-info-app text-info-low m-4 max-w-2xl rounded-lg border p-8 text-center">
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
