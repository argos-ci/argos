import {
  memo,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { useAtomValue } from "jotai/react";
import { ChevronDownIcon, ChevronUpIcon, DownloadIcon } from "lucide-react";
import { useObjectRef } from "react-aria";

import { DocumentType, graphql } from "@/gql";
import { BuildType, ScreenshotDiffStatus } from "@/gql/graphql";
import { BuildDialogs } from "@/pages/Build/BuildDialogs";
import { Code } from "@/ui/Code";
import { IconButton } from "@/ui/IconButton";
import { ImageKitPicture, imgkit } from "@/ui/ImageKitPicture";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";
import { useResizeObserver } from "@/ui/useResizeObserver";
import { useColoredRects } from "@/util/color-detection/hook";
import { Rect } from "@/util/color-detection/types";
import { checkIsImageContentType } from "@/util/content-type";
import { fetchImage } from "@/util/image";
import { useTextContent } from "@/util/text";

import { buildDiffFitContainedAtom } from "./BuildDiffFit";
import { getGroupIcon } from "./BuildDiffGroup";
import {
  BuildDiffHighlighterProvider,
  Highlighter,
  useBuildDiffHighlighterContext,
} from "./BuildDiffHighlighterContext";
import {
  NoScreenshotsBuildEmptyState,
  SkippedBuildEmptyState,
} from "./BuildEmptyStates";
import { buildViewModeAtom } from "./BuildViewMode";
import { DiffEditor, Editor, getLanguageFromContentType } from "./DiffEditor";
import {
  overlayColorAtom,
  overlayVisibleAtom,
  useOverlayStyle,
} from "./OverlayStyle";
import { ScaleProvider, useScaleContext } from "./ScaleContext";
import { SnapshotLoader } from "./SnapshotLoader";
import {
  useZoomerSyncContext,
  useZoomTransform,
  ZoomerSyncProvider,
  ZoomPane,
} from "./Zoomer";

const _BuildFragment = graphql(`
  fragment BuildDiffDetail_Build on Build {
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
    ...BuildDialogs_Build
  }
`);

const _DiffFragment = graphql(`
  fragment BuildDiffDetail_ScreenshotDiff on ScreenshotDiff {
    id
    status
    url
    name
    variantKey
    width
    height
    contentType
    group
    threshold
    baseScreenshot {
      id
      url
      originalUrl
      width
      height
      contentType
      metadata {
        url
        previewUrl
        colorScheme
        mediaType
        automationLibrary {
          name
          version
        }
        browser {
          name
          version
        }
        sdk {
          name
          version
          latestVersion
        }
        viewport {
          width
          height
        }
        test {
          id
          title
          titlePath
          location {
            file
            line
            column
          }
          retry
          retries
          repeat
          annotations {
            type
            description
            location {
              file
              line
              column
            }
          }
        }
      }
    }
    compareScreenshot {
      id
      url
      originalUrl
      width
      height
      contentType
      metadata {
        url
        previewUrl
        colorScheme
        mediaType
        automationLibrary {
          name
          version
        }
        browser {
          name
          version
        }
        sdk {
          name
          version
          latestVersion
        }
        viewport {
          width
          height
        }
        test {
          id
          title
          titlePath
          location {
            file
            line
            column
          }
          retry
          retries
          repeat
          annotations {
            type
            description
            location {
              file
              line
              column
            }
          }
        }
      }
      playwrightTraceUrl
    }
    test {
      id
      last7daysMetrics: metrics(period: LAST_7_DAYS) {
        all {
          total
          flakiness
          stability
          consistency
        }
      }
      ...TestDetails_Test
    }
    last7daysOccurrences: occurrences(period: LAST_7_DAYS)
    change {
      id
      ignored
      ...TestDetails_TestChange
    }
  }
`);

type BuildFragmentDocument = DocumentType<typeof _BuildFragment>;
export type BuildDiffDetailDocument = DocumentType<typeof _DiffFragment>;

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

function BuildScreenshotHeaderPlaceholder() {
  return <div className="h-10.5" />;
}

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
          <div className="shrink-0 text-xs leading-6 font-medium select-none">
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
          <p className="text-low text-sm text-balance">{description}</p>
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
  return transform.scale * imgScale > 1.99 ? "pixelated" : undefined;
}

function ScreenshotPicture(props: ScreenshotPictureProps) {
  const { src, style, width, height, ...attrs } = props;
  const imageRef = useRef<HTMLImageElement>(null);
  const [, setImgScale] = useScaleContext();
  const imageRendering = useImageRendering();
  // Absolute images do not affect the scale context.
  const canAffectScale = !props.className?.includes("absolute");

  const updateScale = useCallback(() => {
    if (canAffectScale) {
      const img = imageRef.current;
      if (img && img.complete) {
        const imgScale = getImageScale(img);
        startTransition(() => {
          setImgScale(imgScale);
        });
      }
    }
  }, [setImgScale, canAffectScale]);

  const ref = useResizeObserver(() => updateScale(), imageRef);

  // Update scale when image is loaded.
  useEffect(() => {
    updateScale();
  }, [updateScale]);

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
      onLoad={() => updateScale()}
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
  diff: BuildDiffDetailDocument;
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

function BaseScreenshot({
  diff,
  buildId,
}: {
  diff: BuildDiffDetailDocument;
  buildId: string;
}) {
  const contained = useAtomValue(buildDiffFitContainedAtom);
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
      if (checkIsImageContentType(diff.baseScreenshot.contentType)) {
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
      return (
        <Snapshot
          url={diff.baseScreenshot.url}
          contentType={diff.baseScreenshot.contentType}
        />
      );
    }
    case ScreenshotDiffStatus.Ignored:
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
              className="absolute top-0 left-0 w-full"
              alt="Baseline screenshot"
              {...getScreenshotPictureProps(diff.baseScreenshot!)}
            />
          </ScreenshotContainer>
        </ZoomPane>
      );
    }
    case ScreenshotDiffStatus.Pending: {
      return null;
    }
    default:
      assertNever(diff.status, `Unexpected diff status: ${diff.status}`);
  }
}

function DownloadCompareScreenshotButton({
  diff,
  buildId,
}: {
  diff: BuildDiffDetailDocument;
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

function CompareScreenshot(props: {
  diff: BuildDiffDetailDocument;
  buildId: string;
}) {
  const { diff, buildId } = props;
  const visible = useAtomValue(overlayVisibleAtom);
  const contained = useAtomValue(buildDiffFitContainedAtom);
  switch (diff.status) {
    case ScreenshotDiffStatus.Added: {
      invariant(diff.compareScreenshot);

      if (checkIsImageContentType(diff.compareScreenshot.contentType)) {
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

      return (
        <Snapshot
          url={diff.compareScreenshot.url}
          contentType={diff.compareScreenshot.contentType}
        />
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
      if (checkIsImageContentType(diff.compareScreenshot.contentType)) {
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
      return (
        <Snapshot
          url={diff.compareScreenshot.url}
          contentType={diff.compareScreenshot.contentType}
        />
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
    case ScreenshotDiffStatus.Ignored:
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
    case ScreenshotDiffStatus.Pending:
      return null;
    default:
      assertNever(diff.status, `Unexpected diff status: ${diff.status}`);
  }
}

function CompareScreenshotChanged(props: {
  diff: BuildDiffDetailDocument;
  buildId: string;
  diffVisible: boolean;
  contained: boolean;
}) {
  const { diff, buildId, diffVisible, contained } = props;
  const { url } = diff;
  const dimensions = useMemo(() => extractDimensions(diff), [diff]);
  invariant(url);
  const [paneSize, setPaneSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const paneRef = useResizeObserver((entry) => {
    startTransition(() => {
      setPaneSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
  });
  const jpgUrl = useMemo(() => imgkit(url, ["f-jpg"]), [url]);
  return (
    <>
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded select-none">
        <ZoomPane
          ref={paneRef}
          dimensions={dimensions}
          controls={
            <DownloadCompareScreenshotButton diff={diff} buildId={buildId} />
          }
        >
          <ScreenshotContainer dimensions={dimensions} contained={contained}>
            <ScreenshotPicture
              className={clsx(
                "absolute top-0 left-0",
                diffVisible && "opacity-disabled",
              )}
              {...getScreenshotPictureProps(diff.compareScreenshot!)}
            />
            <ChangesScreenshotPicture
              className={clsx("relative z-10", contained && "max-h-full")}
              alt="Changes screenshot"
              src={url}
              width={diff.width}
              height={diff.height}
              style={diffVisible ? undefined : { opacity: 0 }}
            />
          </ScreenshotContainer>
        </ZoomPane>
        {dimensions && paneSize && (
          <RectHighlights
            url={jpgUrl}
            paneSize={paneSize}
            imgSize={dimensions}
          />
        )}
      </div>
      {dimensions && paneSize && (
        <DiffIndicator url={jpgUrl} imgSize={dimensions} />
      )}
    </>
  );
}

function RectHighlights(props: {
  url: string;
  paneSize: { width: number; height: number };
  imgSize: { width: number; height: number };
}) {
  const { url, paneSize, imgSize } = props;
  const color = useAtomValue(overlayColorAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const transform = useZoomTransform();
  const rects = useColoredRects({ url, blockSize: 24 });
  const [imgScale] = useScaleContext();
  const realScale = imgScale ? imgScale * transform.scale : null;
  // Convert image coordinates to pane coordinates.
  // Image is centered in the pane and scaled with imgScale.
  const imgToWorkspace = (x: number, y: number): [number, number] => {
    const x1 = (paneSize.width - imgSize.width * imgScale) / 2;
    return [x * imgScale + x1, y * imgScale];
  };
  const { registerHighlighter } = useBuildDiffHighlighterContext();
  const highlight: Highlighter["highlight"] = useEventCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const elements = Array.from(container.children);
    elements.forEach((element) => {
      const circle = element.firstChild;
      invariant(circle instanceof SVGCircleElement);
      const className = "animate-highlight-svg";
      if (!circle.classList.contains(className)) {
        circle.classList.add(className);
        circle.addEventListener("animationend", () => {
          circle.classList.remove(className);
        });
      }
    });
  });

  const [index, setIndex] = useState<number | null>(null);
  const { zoomTo } = useZoomerSyncContext();
  const go: Highlighter["go"] = useEventCallback((direction) => {
    invariant(rects);
    const i = index === null ? (direction === 1 ? -1 : rects.length) : index;
    const nextIndex = (i + direction + rects.length) % rects.length;
    const rect = rects[nextIndex];
    invariant(rect);
    const [x, y] = imgToWorkspace(rect.x, rect.y);
    const maxScale = 2 / imgScale;
    zoomTo(
      {
        x,
        y,
        width: rect.width * imgScale,
        height: rect.height * imgScale,
      },
      { maxScale },
    );
    setIndex(nextIndex);
  });

  const highlighter: Highlighter = useMemo(
    () => ({ highlight, go }),
    [highlight, go],
  );

  const registerContainer = useEventCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      return registerHighlighter(highlighter);
    },
  );

  if (!rects || !realScale) {
    return null;
  }

  return (
    <div ref={registerContainer}>
      {rects.map((rect, index) => {
        const square = rectToSquare(rect, 40 / realScale);
        const [x, y] = imgToWorkspace(square.x, square.y);

        return (
          <svg
            key={index}
            className="pointer-events-none absolute z-10 origin-center overflow-visible"
            style={{
              top: y * transform.scale + transform.y,
              left: x * transform.scale + transform.x,
              width: square.width * imgScale * transform.scale,
              height: square.height * imgScale * transform.scale,
            }}
          >
            <circle
              className="opacity-0"
              cx="50%"
              cy="50%"
              r="50%"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
          </svg>
        );
      })}
    </div>
  );
}

function rectToSquare(rect: Rect, minSize: number): Rect {
  const size = Math.max(rect.width, rect.height, minSize);
  const x = rect.x + (rect.width - size) / 2;
  const y = rect.y + (rect.height - size) / 2;
  return {
    x,
    y,
    width: size,
    height: size,
  };
}

function ChangesScreenshotPicture(props: ScreenshotPictureProps) {
  const style = useOverlayStyle({ src: props.src });
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
const DiffIndicator = memo(function DiffIndicator(props: {
  url: string;
  imgSize: { width: number; height: number };
}) {
  const { imgSize, url } = props;
  const [imgScale] = useScaleContext();
  const rects = useColoredRects({ url, blockSize: 5 });
  const color = useAtomValue(overlayColorAtom);
  const transform = useZoomTransform();
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const containerRef = useResizeObserver((entry) => {
    setContainerSize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    });
  });

  const indicators = (() => {
    if (!rects || !imgScale || !containerSize) {
      return { top: false, bottom: false };
    }
    const top = transform.y / imgScale / transform.scale;
    const h = containerSize.height / imgScale / transform.scale;
    const hasRectAbove = rects.some((rect) => rect.y < -top);
    const hasRectBelow = rects.some((rect) => rect.y + rect.height > h - top);
    return { top: hasRectAbove, bottom: hasRectBelow };
  })();

  const realScale = imgScale ? imgScale * transform.scale : null;
  // Compute the size of a pixel on the screen.
  const screenPixelSize = realScale ? 1 / realScale : null;

  return (
    <>
      {indicators.top && (
        <OutOfScreenDiffIndicator position="top" color={color} />
      )}
      <div
        ref={containerRef}
        className="bg-ui absolute inset-y-0 -left-3 m-px w-1.5 overflow-hidden rounded-sm"
      >
        {(() => {
          if (!rects || !imgScale || !containerSize) {
            return null;
          }

          return (
            <div
              className="absolute top-0 origin-top"
              style={{
                height: imgSize.height,
                transform: `scaleY(${transform.scale}) translateY(${transform.y / transform.scale}px)`,
              }}
            >
              <div
                className="absolute inset-y-0 origin-top"
                style={{ transform: `scaleY(${imgScale})` }}
              >
                {rects.map((rect, index) => (
                  <div
                    key={index}
                    className="absolute w-1.5"
                    style={{
                      backgroundColor: color,
                      top: rect.y,
                      // Ensure that the display height is at least 1 visible pixel.
                      height:
                        screenPixelSize !== null
                          ? Math.max(screenPixelSize, rect.height)
                          : rect.height,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })()}
      </div>
      {indicators.bottom && (
        <OutOfScreenDiffIndicator position="bottom" color={color} />
      )}
    </>
  );
});

const OutOfScreenDiffIndicator = memo(function OutOfScreenDiffIndicator(props: {
  position: "top" | "bottom";
  color: string;
}) {
  const { position, color } = props;
  const { Icon, tooltip, className } = (() => {
    switch (position) {
      case "top":
        return {
          Icon: ChevronUpIcon,
          tooltip: "Scroll up to see more changes",
          className: "animate-bounce-up -top-2.5",
        };
      case "bottom":
        return {
          Icon: ChevronDownIcon,
          tooltip: "Scroll down to see more changes",
          className: "animate-bounce-down -bottom-2.5",
        };
    }
  })();
  return (
    <Tooltip content={tooltip}>
      <Icon
        className={clsx(
          "text-info-app absolute -left-3.5 size-3 focus:outline-none",
          className,
        )}
        style={{ color }}
      />
    </Tooltip>
  );
});

const BuildScreenshots = memo(
  (props: { diff: BuildDiffDetailDocument; build: BuildFragmentDocument }) => {
    const { diff, build } = props;
    const viewMode = useAtomValue(buildViewModeAtom);
    const showBaseline = viewMode === "split" || viewMode === "baseline";
    const showChanges = viewMode === "split" || viewMode === "changes";

    if (
      diff.status === ScreenshotDiffStatus.Changed ||
      diff.status === ScreenshotDiffStatus.Ignored
    ) {
      invariant(diff.compareScreenshot);
      invariant(diff.baseScreenshot);
      if (!checkIsImageContentType(diff.compareScreenshot.contentType)) {
        return (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-4">
            <BuildSnapshotsDiff
              base={{
                url: diff.baseScreenshot.url,
                contentType: diff.baseScreenshot.contentType,
                header: build.baseScreenshotBucket ? (
                  <BuildScreenshotHeader
                    label="Baseline"
                    branch={build.baseBranch}
                    date={build.baseScreenshotBucket.createdAt}
                  />
                ) : (
                  <BuildScreenshotHeaderPlaceholder />
                ),
              }}
              head={{
                url: diff.compareScreenshot.url,
                contentType: diff.compareScreenshot.contentType,
                header: (
                  <BuildScreenshotHeader
                    label="Changes"
                    branch={build.branch}
                    date={build.createdAt}
                  />
                ),
              }}
            />
          </div>
        );
      }
    }

    return (
      <div className="flex min-h-0 min-w-0 flex-1 gap-4 p-4">
        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 [&[hidden]]:hidden"
          hidden={!showBaseline}
        >
          {build.baseScreenshotBucket ? (
            <BuildScreenshotHeader
              label="Baseline"
              branch={build.baseBranch}
              date={build.baseScreenshotBucket.createdAt}
            />
          ) : (
            <BuildScreenshotHeaderPlaceholder />
          )}
          <div className="relative flex min-h-0 flex-1 justify-center">
            <ScaleProvider>
              <BaseScreenshot diff={diff} buildId={build.id} />
            </ScaleProvider>
          </div>
        </div>
        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 [&[hidden]]:hidden"
          hidden={!showChanges}
        >
          <BuildScreenshotHeader
            label="Changes"
            branch={build.branch}
            date={build.createdAt}
          />
          <div className="relative flex min-h-0 flex-1 justify-center">
            <ScaleProvider>
              <CompareScreenshot diff={diff} buildId={build.id} />
            </ScaleProvider>
          </div>
        </div>
      </div>
    );
  },
);

function Snapshot(props: SnapshotProps) {
  return (
    <Suspense fallback={<SnapshotLoader />}>
      <SuspendedSnapshot {...props} />
    </Suspense>
  );
}

type SnapshotProps = { url: string; contentType: string };

function SuspendedSnapshot(props: SnapshotProps) {
  const [text] = useTextContent([props.url]);
  return (
    <Editor
      value={text}
      language={getLanguageFromContentType(props.contentType)}
    />
  );
}

function DiffSnapshots(props: {
  base: { url: string; contentType: string };
  head: { url: string; contentType: string };
  renderSideBySide: boolean;
}) {
  const { base, head, renderSideBySide } = props;
  const [baseText, headText] = useTextContent([base.url, head.url]);
  return (
    <DiffEditor
      original={baseText}
      originalLanguage={getLanguageFromContentType(base.contentType)}
      modified={headText}
      modifiedLanguage={getLanguageFromContentType(head.contentType)}
      renderSideBySide={renderSideBySide}
    />
  );
}

type DiffSnapshotEntry = {
  url: string;
  contentType: string;
  header: ReactNode;
};

function BuildSnapshotsDiff(props: {
  base: DiffSnapshotEntry;
  head: DiffSnapshotEntry;
}) {
  const { base, head } = props;
  const isDiffOverlayVisible = useAtomValue(overlayVisibleAtom);
  const viewMode = useAtomValue(buildViewModeAtom);
  // const [headText, baseText] = useTextContent([props.base, props.head]);
  switch (viewMode) {
    case "baseline": {
      return (
        <>
          <div className="flex shrink-0 justify-center">{base.header}</div>
          <Snapshot url={base.url} contentType={base.contentType} />
        </>
      );
    }
    case "split":
    case "changes": {
      if (viewMode === "changes" && !isDiffOverlayVisible) {
        return (
          <>
            <div className="flex shrink-0 justify-center">{base.header}</div>
            <Snapshot url={base.url} contentType={base.contentType} />
          </>
        );
      }
      const isSplit = viewMode === "split";
      return (
        <>
          <div className="flex shrink-0 gap-4">
            {isSplit ? <div className="flex-1">{base.header}</div> : null}
            <div className="flex-1">{head.header}</div>
          </div>
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center">
                <SnapshotLoader />
              </div>
            }
          >
            <DiffSnapshots base={base} head={head} renderSideBySide={isSplit} />
          </Suspense>
        </>
      );
    }
    default:
      assertNever(viewMode);
  }
}

const useScrollToTop = (
  ref: React.RefObject<HTMLElement | null>,
  activeDiff: BuildDiffDetailDocument | null,
) => {
  useLayoutEffect(() => {
    if (activeDiff && ref.current) {
      ref.current.scroll({
        top: 0,
      });
    }
  }, [ref, activeDiff]);
};

export function BuildDiffDetail(props: {
  build: BuildFragmentDocument;
  diff: BuildDiffDetailDocument | null;
  repoUrl: string | null;
  className?: string;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const { build, diff, header, sidebar, className, ref } = props;
  const containerRef = useObjectRef(ref);
  useScrollToTop(containerRef, diff);
  return (
    <div
      ref={containerRef}
      className={clsx(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto",
        className,
      )}
    >
      {diff ? (
        <ZoomerSyncProvider id={diff.id}>
          <BuildDiffHighlighterProvider>
            <div
              className={clsx(
                "sticky top-0 z-20 shrink-0 border-b-[0.5px] p-4 transition-colors",
              )}
            >
              {header}
            </div>
            <div className="flex min-h-0 min-w-0 flex-1">
              <BuildScreenshots build={build} diff={diff} />
              {sidebar}
            </div>
            <BuildDialogs build={build} />
          </BuildDiffHighlighterProvider>
        </ZoomerSyncProvider>
      ) : build.type === BuildType.Skipped ? (
        <Centered>
          <SkippedBuildEmptyState />
        </Centered>
      ) : build.stats?.total === 0 ? (
        <Centered>
          <NoScreenshotsBuildEmptyState />
        </Centered>
      ) : null}
    </div>
  );
}

function Centered(props: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-full min-h-0 flex-1 items-center justify-center"
      {...props}
    />
  );
}
