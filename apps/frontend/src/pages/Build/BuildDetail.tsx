import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ChevronDownIcon, ChevronUpIcon, DownloadIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { Code } from "@/ui/Code";
import { IconButton } from "@/ui/IconButton";
import { ImageKitPicture, imgkit } from "@/ui/ImageKitPicture";
import { Link } from "@/ui/Link";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useResizeObserver } from "@/ui/useResizeObserver";
import { useScrollListener } from "@/ui/useScrollListener";
import { useColoredRects } from "@/util/color-detection/hook";
import { fetchImage } from "@/util/image";

import { BuildDetailToolbar } from "./BuildDetailToolbar";
import {
  useBuildDiffColorState,
  useBuildDiffColorStyle,
} from "./BuildDiffColorState";
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
import { ScaleProvider, useScaleContext } from "./ScaleContext";
import {
  BuildDiffViewModeStateProvider,
  useBuildDiffViewModeState,
} from "./useBuildDiffViewModeState";
import { useZoomTransform, ZoomerSyncProvider, ZoomPane } from "./Zoomer";

const _BuildFragment = graphql(`
  fragment BuildDetail_Build on Build {
    id
    stats {
      total
    }
    createdAt
    branch
    type
    baseBranch
    baseScreenshotBucket {
      id
      createdAt
    }
    pullRequest {
      merged
    }
  }
`);

type BuildFragmentDocument = DocumentType<typeof _BuildFragment>;

const DownloadScreenshotButton = memo(
  (props: { url: string; tooltip: string; name: string }) => {
    const [loading, setLoading] = useState(false);

    return (
      <Tooltip placement="left" content={props.tooltip}>
        <IconButton
          variant="contained"
          isDisabled={loading}
          onPress={() => {
            setLoading(true);
            fetchImage(props.url)
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
        >
          <DownloadIcon />
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
    branch: string | null | undefined;
    date: string | null;
  }) => {
    return (
      <div className="text-low flex shrink-0 flex-col items-center gap-0.5">
        <div className="flex max-w-full items-center gap-1">
          <div className="shrink-0 select-none text-xs font-medium leading-6">
            {label}
            {branch ? " from" : null}
          </div>
          {branch && (
            <Code className="truncate" title={branch}>
              {branch}
            </Code>
          )}
        </div>
        {date && <Time date={date} className="text-xxs" />}
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
        <div className="bg-app flex flex-col items-center gap-4 rounded-sm border p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="*:size-10">{icon}</div>
            <div className="text-base font-medium">{title}</div>
          </div>
          <p className="text-low text-balance text-sm">{description}</p>
        </div>
      </div>
    );
  },
);

function getAspectRatio(dimensions: { width: number; height: number }) {
  return `${dimensions.width}/${dimensions.height}`;
}

function getScreenshotPictureProps(screenshot: {
  url: string;
  width?: number | null | undefined;
  height?: number | null | undefined;
}) {
  return {
    src: screenshot.url,
    width: screenshot.width,
    height: screenshot.height,
  };
}

/**
 * Returns the scale of the image.
 */
function getImageScale(element: HTMLImageElement) {
  if (element.naturalWidth > element.naturalHeight) {
    return element.width / element.naturalWidth;
  }
  return element.height / element.naturalHeight;
}

type ScreenshotPictureProps = Omit<
  React.ComponentProps<typeof ImageKitPicture>,
  "width" | "height"
> & {
  src: string;
  width?: number | null | undefined;
  height?: number | null | undefined;
};

function useImageRendering() {
  const transform = useZoomTransform();
  const [imgScale] = useScaleContext();
  return transform.scale * imgScale > 2.5 ? "pixelated" : undefined;
}

function ScreenshotPicture(props: ScreenshotPictureProps) {
  const { src, style, width, height, ...attrs } = props;
  const ref = useRef<HTMLImageElement>(null);
  const [, setImgScale] = useScaleContext();
  const imageRendering = useImageRendering();
  // Absolute images do not affect the scale context.
  const canAffectScale = !props.className?.includes("absolute");

  // Update scale when image is loaded.
  useEffect(() => {
    if (!canAffectScale) {
      return undefined;
    }

    const img = ref.current;
    invariant(img);

    const update = () => setImgScale(getImageScale(img));

    if (img.complete) {
      update();
      return undefined;
    }

    img.addEventListener("load", update);
    return () => img.removeEventListener("load", update);
  }, [
    canAffectScale,
    setImgScale,
    // Watch classname, because it can change the size of the image
    props.className,
    // Watch src, because it can change the size of the image
    src,
  ]);

  // Reset scale when component is unmounted.
  useEffect(() => {
    if (!canAffectScale) {
      return undefined;
    }
    return () => setImgScale(1);
  }, [canAffectScale, setImgScale]);

  return (
    <ImageKitPicture
      key={src}
      ref={ref}
      src={src}
      original
      style={{
        ...style,
        aspectRatio:
          width && height ? getAspectRatio({ width, height }) : undefined,
        imageRendering,
      }}
      {...attrs}
    />
  );
}

function ScreenshotContainer(props: {
  ref?: React.Ref<HTMLDivElement>;
  dimensions:
    | {
        width: number;
        height: number;
      }
    | undefined;
  contained: boolean;
  children: React.ReactNode;
}) {
  const { ref, dimensions, contained, children } = props;
  return (
    <div
      ref={ref}
      className={clsx(
        "relative min-h-0 min-w-0",
        contained && "max-h-full max-w-full",
      )}
      style={
        contained && dimensions
          ? {
              aspectRatio: getAspectRatio(dimensions),
              height: dimensions.height,
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
      url={diff.baseScreenshot!.originalUrl}
      tooltip="Download baseline screenshot"
      name={`Build #${buildId} - ${diff.name} - baseline.png`}
    />
  );
}

function extractDimensions(dimensions: {
  width?: number | undefined | null;
  height?: number | undefined | null;
}) {
  const { width, height } = dimensions;
  return typeof width === "number" && typeof height === "number"
    ? { width: width, height: height }
    : undefined;
}

function BaseScreenshot({ diff, buildId }: { diff: Diff; buildId: string }) {
  const { contained } = useBuildDiffFitState();
  switch (diff.status) {
    case ScreenshotDiffStatus.Added:
      return (
        <MissingScreenshotInfo
          title="New screenshot"
          description={
            <>
              This screenshot was added in this build that&quot;s why it
              doesn&quot;t have a baseline to compare with.
            </>
          }
          icon={getGroupIcon(ScreenshotDiffStatus.Added)}
        />
      );
    case ScreenshotDiffStatus.RetryFailure:
      return (
        <MissingScreenshotInfo
          title="End-to-end retried test failure screenshot"
          description={
            <>
              This failure screenshot does not have a baseline for comparison.
              <br />A failure screenshot is captured at the end of a failed
              end-to-end test attempt. However, since the test was retried and
              passed afterward, this screenshot is not considered a failure.
            </>
          }
          icon={getGroupIcon(ScreenshotDiffStatus.Failure)}
        />
      );
    case ScreenshotDiffStatus.Failure:
      return (
        <MissingScreenshotInfo
          title="End-to-end test failure screenshot"
          description={
            <>
              This failure screenshot does not have a baseline for comparison.
              <br />A failure screenshot is captured at the end of a failed
              end-to-end test attempt. Its sole purpose is to assist with
              debugging by providing insights into why the test failed.
            </>
          }
          icon={getGroupIcon(ScreenshotDiffStatus.Failure)}
        />
      );
    case ScreenshotDiffStatus.Unchanged:
      return (
        <MissingScreenshotInfo
          title="Unchanged screenshot"
          description={
            <>
              All good! This screenshot is similar to the baseline screenshot.
            </>
          }
          icon={getGroupIcon(ScreenshotDiffStatus.Unchanged)}
        />
      );
    case ScreenshotDiffStatus.Removed: {
      invariant(
        diff.baseScreenshot,
        "baseScreenshot is defined for removed screenshots",
      );
      const dimensions = extractDimensions(diff.baseScreenshot);
      return (
        <ZoomPane
          dimensions={dimensions}
          controls={
            <DownloadBaseScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={dimensions} contained={contained}>
            <ScreenshotPicture
              className={clsx(contained && "max-h-full")}
              alt="Baseline screenshot"
              {...getScreenshotPictureProps(diff.baseScreenshot)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.Changed: {
      const dimensions = extractDimensions(diff);
      invariant(diff.url, "Expected diff.url to be defined");
      return (
        <ZoomPane
          dimensions={dimensions}
          controls={
            <DownloadBaseScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={dimensions} contained={contained}>
            <ScreenshotPicture
              className={clsx("relative opacity-0", contained && "max-h-full")}
              src={diff.url}
              width={diff.width}
              height={diff.height}
            />
            <ScreenshotPicture
              className="absolute left-0 top-0 w-full"
              alt="Baseline screenshot"
              {...getScreenshotPictureProps(diff.baseScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    default:
      return null;
  }
}

function DownloadCompareScreenshotButton({
  diff,
  buildId,
}: {
  diff: Diff;
  buildId: string;
}) {
  return (
    <DownloadScreenshotButton
      url={diff.compareScreenshot!.originalUrl}
      tooltip="Download changes screenshot"
      name={`Build #${buildId} - ${diff.name} - new.png`}
    />
  );
}

function CompareScreenshot(props: { diff: Diff; buildId: string }) {
  const { diff, buildId } = props;
  const { visible } = useBuildDiffVisibleState();
  const { contained } = useBuildDiffFitState();
  switch (diff.status) {
    case ScreenshotDiffStatus.Added: {
      invariant(diff.compareScreenshot);
      const dimensions = extractDimensions(diff.compareScreenshot);
      return (
        <ZoomPane
          dimensions={dimensions}
          controls={
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={dimensions} contained={contained}>
            <ScreenshotPicture
              className={clsx(contained && "max-h-full max-w-full")}
              alt="Changes screenshot"
              {...getScreenshotPictureProps(diff.compareScreenshot)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.Failure: {
      invariant(diff.compareScreenshot);
      const dimensions = extractDimensions(diff.compareScreenshot);
      return (
        <ZoomPane
          dimensions={dimensions}
          controls={
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={dimensions} contained={contained}>
            <ScreenshotPicture
              className={clsx(contained && "max-h-full max-w-full")}
              alt="Failure screenshot"
              {...getScreenshotPictureProps(diff.compareScreenshot)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.RetryFailure: {
      invariant(diff.compareScreenshot);
      const dimensions = extractDimensions(diff.compareScreenshot);
      return (
        <ZoomPane
          dimensions={dimensions}
          controls={
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={dimensions} contained={contained}>
            <ScreenshotPicture
              className={clsx(contained && "max-h-full max-w-full")}
              alt="Retried failure screenshot"
              {...getScreenshotPictureProps(diff.compareScreenshot)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.Unchanged: {
      invariant(diff.compareScreenshot);
      const dimensions = extractDimensions(diff.compareScreenshot);
      return (
        <ZoomPane
          dimensions={dimensions}
          controls={
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={dimensions} contained={contained}>
            <ScreenshotPicture
              className={clsx(contained && "max-h-full max-w-full")}
              alt="Baseline screenshot"
              {...getScreenshotPictureProps(diff.compareScreenshot)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.Removed: {
      return (
        <MissingScreenshotInfo
          title="Removed screenshot"
          description={
            <>
              This screenshot was removed in this build that's why it has no
              changes to compare with.
            </>
          }
          icon={getGroupIcon(ScreenshotDiffStatus.Removed)}
        />
      );
    }
    case ScreenshotDiffStatus.Changed: {
      return (
        <CompareScreenshotChanged
          diff={diff}
          buildId={buildId}
          contained={contained}
          diffVisible={visible}
        />
      );
    }
    default:
      return null;
  }
}

function CompareScreenshotChanged(props: {
  diff: Diff;
  buildId: string;
  diffVisible: boolean;
  contained: boolean;
}) {
  const { diff, buildId, diffVisible, contained } = props;
  const dimensions = extractDimensions(diff);
  const [imgScale] = useScaleContext();
  invariant(diff.url);
  return (
    <>
      <ZoomPane
        dimensions={dimensions}
        controls={
          <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
        }
      >
        <ScreenshotContainer dimensions={dimensions} contained={contained}>
          <ScreenshotPicture
            className={clsx(
              "absolute left-0 top-0",
              diffVisible && "opacity-disabled",
            )}
            {...getScreenshotPictureProps(diff.compareScreenshot!)}
          />
          <ChangesScreenshotPicture
            className={clsx("relative z-10", contained && "max-h-full")}
            alt="Changes screenshot"
            src={diff.url}
            width={diff.width}
            height={diff.height}
            style={diffVisible ? undefined : { opacity: 0 }}
          />
        </ScreenshotContainer>
      </ZoomPane>
      <DiffIndicator
        key={diff.url}
        url={imgkit(diff.url, ["f-jpg"])}
        scale={imgScale}
        height={diff.height ?? null}
      />
    </>
  );
}

function ChangesScreenshotPicture(props: ScreenshotPictureProps) {
  const style = useBuildDiffColorStyle({ src: props.src });
  const imageRendering = useImageRendering();
  return (
    <span style={{ ...style, imageRendering, ...props.style }}>
      <ScreenshotPicture
        alt="Changes screenshot"
        {...props}
        style={{ opacity: 0, display: "block" }}
      />
    </span>
  );
}

/**
 * Detects colored areas in the image provided by the URL.
 */
function DiffIndicator(props: {
  url: string;
  scale: number | null;
  height: number | null;
}) {
  const { scale, height } = props;
  const rects = useColoredRects({ url: props.url });
  const { color } = useBuildDiffColorState();
  const transform = useZoomTransform();
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const containerRef = useResizeObserver((entry) => {
    setContainerHeight(entry.contentRect.height);
  });

  const indicators = (() => {
    if (!rects || !scale || !height || !containerHeight) {
      return { top: false, bottom: false };
    }
    const top = transform.y / scale / transform.scale;
    const h = containerHeight / scale / transform.scale;
    const hasRectAbove = rects.some((rect) => rect.y < -top);
    const hasRectBelow = rects.some((rect) => rect.y + rect.height > h - top);
    return { top: hasRectAbove, bottom: hasRectBelow };
  })();

  return (
    <>
      {indicators.top && (
        <Tooltip content="Scroll up to see more changes">
          <ChevronUpIcon
            className="text-info-app animate-bounce-up absolute -left-3.5 -top-2.5 size-3"
            style={{ color }}
          />
        </Tooltip>
      )}
      <div
        ref={containerRef}
        className="bg-ui absolute inset-y-0 -left-3 m-px w-1.5 overflow-hidden rounded-sm"
      >
        {(() => {
          if (!rects || !scale || !height || !containerHeight) {
            return null;
          }

          return (
            <div
              className="absolute top-0 origin-top"
              style={{
                height,
                transform: `scaleY(${transform.scale}) translateY(${transform.y / transform.scale}px)`,
              }}
            >
              <div
                className="absolute inset-y-0 origin-top"
                style={{ transform: `scaleY(${scale})` }}
              >
                {rects.map((rect, index) => (
                  <div
                    key={index}
                    className="absolute w-1.5"
                    style={{
                      backgroundColor: color,
                      top: rect.y,
                      height: rect.height,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })()}
      </div>
      {indicators.bottom && (
        <Tooltip content="Scroll down to see more changes">
          <ChevronDownIcon
            className="text-info-app animate-bounce-down absolute -bottom-2.5 -left-3.5 size-3"
            style={{ color }}
          />
        </Tooltip>
      )}
    </>
  );
}

const BuildScreenshots = memo(
  (props: { diff: Diff; build: BuildFragmentDocument }) => {
    const { viewMode } = useBuildDiffViewModeState();
    const showBaseline = viewMode === "split" || viewMode === "baseline";
    const showChanges = viewMode === "split" || viewMode === "changes";

    return (
      <div className={clsx("min-h-0 flex-1", "flex gap-4 px-4")}>
        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 [&[hidden]]:hidden"
          hidden={!showBaseline}
        >
          {props.build.baseScreenshotBucket ? (
            <BuildScreenshotHeader
              label="Baseline"
              branch={props.build.baseBranch}
              date={props.build.baseScreenshotBucket.createdAt}
            />
          ) : (
            <div className="h-[2.625rem]" />
          )}
          <div className="relative flex min-h-0 flex-1 justify-center">
            <ScaleProvider>
              <BaseScreenshot diff={props.diff} buildId={props.build.id} />
            </ScaleProvider>
          </div>
        </div>
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
            <ScaleProvider>
              <CompareScreenshot diff={props.diff} buildId={props.build.id} />
            </ScaleProvider>
          </div>
        </div>
      </div>
    );
  },
);

const useScrollToTop = (
  ref: React.RefObject<HTMLElement | null>,
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

export function BuildDetail(props: {
  build: BuildFragmentDocument;
  repoUrl: string | null;
}) {
  const { build } = props;
  const { activeDiff, siblingDiffs } = useBuildDiffState();
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
                  siblingDiffs={siblingDiffs}
                  repoUrl={props.repoUrl}
                  baseBranch={build.baseBranch ?? null}
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
      ) : build.stats?.total === 0 ? (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center">
          <div className="border-info bg-info-app text-info-low m-4 max-w-2xl rounded-lg border p-8 text-center">
            <div className="mb-2 text-lg font-semibold">
              No screenshot found
            </div>
            Be sure to specify a directory containing images in the upload
            command.
            <br />
            <Link
              href="https://argos-ci.com/docs/argos-cli#upload-command"
              target="_blank"
            >
              See upload documentation
            </Link>
            .
          </div>
        </div>
      ) : null}
    </div>
  );
}
