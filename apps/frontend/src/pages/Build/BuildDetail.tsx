import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { DownloadIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { Code } from "@/ui/Code";
import { IconButton } from "@/ui/IconButton";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import { Link } from "@/ui/Link";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useLiveRef } from "@/ui/useLiveRef";
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
        <div className="bg-app flex flex-col items-center gap-4 rounded border p-8 text-center">
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

function getAspectRatio(dimensions: {
  width?: number | null | undefined;
  height?: number | null | undefined;
}) {
  return dimensions.width && dimensions.height
    ? `${dimensions.width}/${dimensions.height}`
    : undefined;
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
  onScaleChange?: (scale: number | null) => void;
};

function ScreenshotPicture(props: ScreenshotPictureProps) {
  const { src, style, width, height, onScaleChange, ...attrs } = props;
  const transform = useZoomTransform();
  const ref = useRef<HTMLImageElement>(null);
  const [pixelated, setPixelated] = useState(false);
  useEffect(() => {
    if (transform.scale && ref.current) {
      if (!Number.isNaN(ref.current.naturalWidth)) {
        const realScale = transform.scale - getImageScale(ref.current);
        setPixelated(realScale > 1.5);
      }
    }
  }, [transform.scale]);
  const onScaleChangeRef = useLiveRef(onScaleChange);
  useEffect(() => {
    const onScaleChange = onScaleChangeRef.current;
    if (!onScaleChange) {
      return undefined;
    }
    return () => {
      onScaleChange(null);
    };
  }, [onScaleChangeRef]);
  useEffect(() => {
    const onScaleChange = onScaleChangeRef.current;
    const img = ref.current;
    if (onScaleChange && img?.complete) {
      onScaleChange(getImageScale(img));
    }
    // Watch classname, because it can change the size of the image
  }, [onScaleChangeRef, props.className]);
  return (
    <ImageKitPicture
      key={src}
      ref={ref}
      src={src}
      original
      style={{
        ...style,
        aspectRatio: getAspectRatio({ width, height }),
        imageRendering: pixelated ? "pixelated" : undefined,
      }}
      onLoad={
        onScaleChange
          ? (event) => {
              const img = event.target as HTMLImageElement;
              onScaleChange?.(getImageScale(img));
            }
          : undefined
      }
      {...attrs}
    />
  );
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
      url={diff.baseScreenshot!.originalUrl}
      tooltip="Download baseline screenshot"
      name={`Build #${buildId} - ${diff.name} - baseline.png`}
    />
  );
}

const BaseScreenshot = ({ diff, buildId }: { diff: Diff; buildId: string }) => {
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
            <ScreenshotPicture
              className={clsx(contained && "max-h-full")}
              alt="Baseline screenshot"
              {...getScreenshotPictureProps(diff.baseScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.Changed: {
      return (
        <ZoomPane
          controls={
            <DownloadBaseScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={diff} contained={contained}>
            <ScreenshotPicture
              className={clsx("relative opacity-0", contained && "max-h-full")}
              src={diff.url!}
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
      url={diff.compareScreenshot!.originalUrl}
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
  switch (diff.status) {
    case ScreenshotDiffStatus.Added: {
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
            <ScreenshotPicture
              className={clsx(contained && "max-h-full max-w-full")}
              alt="Changes screenshot"
              {...getScreenshotPictureProps(diff.compareScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.Failure: {
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
            <ScreenshotPicture
              className={clsx(contained && "max-h-full")}
              alt="Failure screenshot"
              {...getScreenshotPictureProps(diff.compareScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.RetryFailure: {
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
            <ScreenshotPicture
              className={clsx(contained && "max-h-full")}
              alt="Retried failure screenshot"
              {...getScreenshotPictureProps(diff.compareScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.Unchanged: {
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
            <ScreenshotPicture
              className={clsx(contained && "max-h-full")}
              alt="Baseline screenshot"
              {...getScreenshotPictureProps(diff.compareScreenshot!)}
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
};

function CompareScreenshotChanged(props: {
  diff: Diff;
  buildId: string;
  diffVisible: boolean;
  contained: boolean;
}) {
  const { diff, buildId, diffVisible, contained } = props;
  const [scale, setScale] = useState<number | null>(null);
  invariant(diff.url, "Expected diff.url to be defined");
  return (
    <>
      <ZoomPane
        controls={
          <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
        }
      >
        <ScreenshotContainer dimensions={diff} contained={contained}>
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
            onScaleChange={setScale}
            style={diffVisible ? undefined : { opacity: 0 }}
          />
        </ScreenshotContainer>
      </ZoomPane>
      <DiffIndicator
        key={diff.url}
        url={diff.url}
        scale={scale}
        height={diff.height ?? null}
        visible={diffVisible}
      />
    </>
  );
}

function ChangesScreenshotPicture(props: ScreenshotPictureProps) {
  const style = useBuildDiffColorStyle({ height: props.height });
  return (
    <ScreenshotPicture
      alt="Changes screenshot"
      {...props}
      style={{ ...style, ...props.style }}
    />
  );
}

/**
 * Detects colored areas in the image provided by the URL.
 */
function DiffIndicator(props: {
  url: string;
  scale: number | null;
  height: number | null;
  visible: boolean;
}) {
  const rects = useColoredRects({ url: props.url });
  const transform = useZoomTransform();

  return (
    <div
      className={clsx(
        "bg-ui absolute inset-y-0 -left-3 m-px w-1.5 overflow-hidden rounded",
        !props.visible && "opacity-0",
      )}
    >
      {rects && props.scale && props.height ? (
        <div
          className="absolute top-0 origin-top"
          style={{
            height: props.height,
            transform: `scaleY(${transform.scale}) translateY(${transform.y / transform.scale}px)`,
          }}
        >
          <div
            className="absolute inset-y-0 origin-top"
            style={{ transform: `scaleY(${props.scale})` }}
          >
            {rects.map((rect, index) => (
              <DiffIndicatorRect
                key={index}
                className="absolute w-1.5"
                style={{
                  top: rect.y,
                  height: rect.height,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DiffIndicatorRect(props: React.ComponentPropsWithoutRef<"div">) {
  const { color } = useBuildDiffColorState();
  return (
    <div
      {...props}
      style={{
        backgroundColor: color,
        ...props.style,
      }}
    />
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
            <BaseScreenshot diff={props.diff} buildId={props.build.id} />
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
            <CompareScreenshot diff={props.diff} buildId={props.build.id} />
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
