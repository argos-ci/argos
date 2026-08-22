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
import { useAtom, useAtomValue } from "jotai/react";
import {
  BlendIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  FileDownIcon,
  Layers2Icon,
  type LucideIcon,
} from "lucide-react";

import {
  getCopyImageSubmenu,
  downloadBlob,
  getDownloadImageSubmenu,
  downloadWithToast,
  fetchBlob,
  ImageActionsMenu,
} from "@/containers/Build/ScreenshotActions";
import { useProjectRepositoryUrl } from "@/containers/Project/RepositoryContext";
import { DocumentType, graphql } from "@/gql";
import { BuildType, ScreenshotDiffStatus } from "@/gql/graphql";
import { getBuildURL } from "@/pages/Build/BuildParams";
import { DiffCommentLayer } from "@/pages/Build/diffComments/DiffCommentLayer";
import { BranchLink, CommitLink } from "@/pages/Build/GitLink";
import { ScreenshotCommentLayer } from "@/pages/Build/screenshotComments/ScreenshotCommentLayer";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import { Link } from "@/ui/Link";
import { MenuItem, MenuSeparator } from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";
import { useObjectRef } from "@/ui/useObjectRef";
import { useResizeObserver } from "@/ui/useResizeObserver";
import { useColoredRects } from "@/util/color-detection/hook";
import { checkIsImageContentType } from "@/util/content-type";
import { useTextContent } from "@/util/text";

import { OnionOpacityControl, SwipeDivider } from "./BlendControls";
import { buildDiffFitContainedAtom } from "./BuildDiffFit";
import { getDiffGroupDefinition } from "./BuildDiffGroup";
import {
  NoScreenshotsBuildEmptyState,
  SkippedBuildEmptyState,
} from "./BuildEmptyStates";
import {
  buildViewModeAtom,
  checkDiffCanBeBlended,
  checkIsBlendViewMode,
  onionOpacityAtom,
  swipeHandleYAtom,
  swipePositionAtom,
  type BlendViewMode,
} from "./BuildViewMode";
import {
  ChangesHighlights,
  ChangesMask,
  getChangesDetectionUrl,
} from "./ChangesOverlay";
import { Editor, getLanguageFromContentType } from "./DiffEditor";
import {
  overlayColorAtom,
  overlayOpacityAtom,
  overlayVisibleAtom,
} from "./OverlayStyle";
import { getImageScale } from "./projection";
import { ScaleProvider, useScaleContext } from "./ScaleContext";
import { SnapshotLoader } from "./SnapshotLoader";
import { useZoomTransform, ZoomPane } from "./Zoomer";

const _BuildFragment = graphql(`
  fragment BuildDiffDetail_Build on Build {
    id
    stats {
      total
    }
    createdAt
    branch
    commit
    type
    baseBranch
    baseBuild {
      id
      number
    }
    baseScreenshotBucket {
      id
      createdAt
      commit
    }
    deployment {
      id
      url
    }
    pullRequest {
      merged
    }
    ...ScreenshotCommentLayer_Build
    ...DiffCommentLayer_Build
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
          tags
        }
        tags
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
          tags
        }
        tags
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
      ...RightSidebar_Test
    }
    last7daysOccurrences: occurrences(period: LAST_7_DAYS)
    change {
      id
      ignored
      ...RightSidebar_TestChange
    }
  }
`);

type BuildFragmentDocument = DocumentType<typeof _BuildFragment>;
export type BuildDiffDetailDocument = DocumentType<typeof _DiffFragment>;

async function loadImageElement(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    image.src = url;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Failed to create image blob from canvas"));
    }, "image/png");
  });
}

async function createMaskedCompareBlob(props: {
  compareUrl: string;
  maskUrl: string;
  color: string;
  opacity: number;
}) {
  const [compareImage, maskImage] = await Promise.all([
    loadImageElement(props.compareUrl),
    loadImageElement(props.maskUrl),
  ]);

  const compareDimensions = {
    width: compareImage.naturalWidth,
    height: compareImage.naturalHeight,
  };
  const maskDimensions = {
    width: maskImage.naturalWidth,
    height: maskImage.naturalHeight,
  };
  const resultDimensions = {
    width: Math.max(compareDimensions.width, maskDimensions.width),
    height: Math.max(compareDimensions.height, maskDimensions.height),
  };
  const canvas = document.createElement("canvas");
  canvas.width = resultDimensions.width;
  canvas.height = resultDimensions.height;
  const context = canvas.getContext("2d");
  invariant(context, "Expected canvas to have a 2d context");

  context.drawImage(
    compareImage,
    0,
    0,
    compareDimensions.width,
    compareDimensions.height,
  );

  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = maskDimensions.width;
  overlayCanvas.height = maskDimensions.height;
  const overlayContext = overlayCanvas.getContext("2d");
  invariant(overlayContext, "Expected overlay canvas to have a 2d context");

  overlayContext.fillStyle = props.color;
  overlayContext.globalAlpha = props.opacity;
  overlayContext.fillRect(0, 0, maskDimensions.width, maskDimensions.height);
  overlayContext.globalAlpha = 1;
  overlayContext.globalCompositeOperation = "destination-in";
  overlayContext.drawImage(
    maskImage,
    0,
    0,
    maskDimensions.width,
    maskDimensions.height,
  );

  context.drawImage(
    overlayCanvas,
    0,
    0,
    maskDimensions.width,
    maskDimensions.height,
  );

  return canvasToBlob(canvas);
}

/** Keeps a pane without a header aligned with the one beside it. */
function BuildScreenshotHeaderPlaceholder() {
  return <div className="h-6" />;
}

/**
 * The label over a pane, naming which side of the comparison it shows. The
 * details the line used to spell out — branch, commit, date — live in a hover
 * card instead, which also has room for what never fit: where the baseline
 * comes from.
 */
function BuildScreenshotHeader(props: {
  label: string;
  details: React.ReactNode;
}) {
  return (
    <div className="text-low flex shrink-0 justify-center">
      <Tooltip
        variant="info"
        // The card holds links, so it has to stay hoverable.
        disableHoverableContent={false}
        content={props.details}
      >
        <div
          tabIndex={0}
          className="underline-emphasis text-xs leading-6 font-medium select-none"
        >
          {props.label}
        </div>
      </Tooltip>
    </div>
  );
}

/**
 * What a side of the comparison is, then where it came from.
 *
 * The sentence leads because the labels do not explain themselves: a reviewer
 * meeting "Baseline" for the first time needs to know it is the state being
 * compared against before a commit sha means anything.
 */
function ScreenshotHeaderDetails(props: {
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-2xs p-0.5 text-xs">
      <p className="text-low text-balance">{props.description}</p>
      <dl className="border-t-thin mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 pt-2">
        {props.children}
      </dl>
    </div>
  );
}

function ScreenshotHeaderDetail(props: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-low">{props.label}</dt>
      <dd className="font-medium">{props.children}</dd>
    </>
  );
}

const BaselineScreenshotHeader = memo(
  (props: { build: BuildFragmentDocument }) => {
    const { build } = props;
    if (!build.baseScreenshotBucket) {
      return <BuildScreenshotHeaderPlaceholder />;
    }
    return (
      <BuildScreenshotHeader
        label="Baseline"
        details={<BaselineDetails build={build} />}
      />
    );
  },
);

/** Mounted only while the card is open, like every tooltip content. */
function BaselineDetails(props: { build: BuildFragmentDocument }) {
  const { build } = props;
  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");
  const repoUrl = useProjectRepositoryUrl();
  const { baseScreenshotBucket } = build;
  invariant(baseScreenshotBucket, "guarded by BaselineScreenshotHeader");
  return (
    <ScreenshotHeaderDetails
      description={
        <>
          The snapshot this build was compared against, kept from the last
          approved build.{" "}
          <Link
            href="https://argos-ci.com/docs/learn/platform-fundamentals/baseline-build"
            target="_blank"
          >
            Learn more
          </Link>
        </>
      }
    >
      {build.baseBuild && (
        <ScreenshotHeaderDetail label="Build">
          <Link
            className="font-mono"
            href={getBuildURL({
              ...params,
              buildNumber: build.baseBuild.number,
            })}
          >
            #{build.baseBuild.number}
          </Link>
        </ScreenshotHeaderDetail>
      )}
      {build.baseBranch && (
        <ScreenshotHeaderDetail label="Branch">
          <BranchLink repoUrl={repoUrl} branch={build.baseBranch} />
        </ScreenshotHeaderDetail>
      )}
      <ScreenshotHeaderDetail label="Commit">
        <CommitLink repoUrl={repoUrl} commit={baseScreenshotBucket.commit} />
      </ScreenshotHeaderDetail>
    </ScreenshotHeaderDetails>
  );
}

const ChangesScreenshotHeader = memo(
  (props: { build: BuildFragmentDocument }) => (
    <BuildScreenshotHeader
      label="Changes"
      details={<ChangesDetails build={props.build} />}
    />
  ),
);

/** Mounted only while the card is open, like every tooltip content. */
function ChangesDetails(props: { build: BuildFragmentDocument }) {
  const { build } = props;
  const repoUrl = useProjectRepositoryUrl();
  return (
    <ScreenshotHeaderDetails description="The snapshot this build captured. Approving it makes it the next baseline.">
      {build.branch && (
        <ScreenshotHeaderDetail label="Branch">
          <BranchLink repoUrl={repoUrl} branch={build.branch} />
        </ScreenshotHeaderDetail>
      )}
      <ScreenshotHeaderDetail label="Commit">
        <CommitLink repoUrl={repoUrl} commit={build.commit} />
      </ScreenshotHeaderDetail>
    </ScreenshotHeaderDetails>
  );
}

const MissingScreenshotInfo = memo(
  (props: {
    title: React.ReactNode;
    description: React.ReactNode;
    icon: LucideIcon;
  }) => {
    const { icon: Icon, title, description } = props;
    return (
      <div className="w-full">
        <div className="bg-app border-thin flex flex-col items-center gap-4 rounded-md p-8 text-center shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <Icon className="size-10" />
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
        if (imgScale !== null) {
          startTransition(() => {
            setImgScale(imgScale);
          });
        }
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

function BaseScreenshotActionsMenu({
  diff,
  buildId,
}: {
  diff: BuildDiffDetailDocument;
  buildId: string;
}) {
  const { baseScreenshot } = diff;
  invariant(baseScreenshot);
  return (
    <ImageActionsMenu
      tooltip="Baseline screenshot actions"
      ariaLabel="Baseline screenshot actions"
    >
      {getCopyImageSubmenu({ publicUrl: baseScreenshot.url, alt: diff.name })}
      <MenuSeparator />
      <MenuItem
        icon={<DownloadIcon />}
        onAction={() => {
          downloadWithToast(
            fetchBlob(baseScreenshot.originalUrl).then((blob) => {
              downloadBlob(
                blob,
                `Build #${buildId} - ${diff.name} - baseline.png`,
              );
            }),
          );
        }}
      >
        Download
      </MenuItem>
    </ImageActionsMenu>
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
          icon={getDiffGroupDefinition(diff.status).icon}
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
          icon={getDiffGroupDefinition(diff.status).icon}
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
          icon={getDiffGroupDefinition(diff.status).icon}
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
          icon={getDiffGroupDefinition(diff.status).icon}
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
              <BaseScreenshotActionsMenu diff={diff} buildId={buildId} />
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
          controls={<BaseScreenshotActionsMenu diff={diff} buildId={buildId} />}
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

function CompareScreenshotActionsMenu({
  diff,
  buildId,
}: {
  diff: BuildDiffDetailDocument;
  buildId: string;
}) {
  const overlayColor = useAtomValue(overlayColorAtom);
  const overlayOpacity = useAtomValue(overlayOpacityAtom);
  const getName = (identifier: string) => {
    return `Build #${buildId} - ${diff.name} - ${identifier}.png`;
  };

  const { url: diffUrl, compareScreenshot } = diff;
  invariant(compareScreenshot);

  return (
    <ImageActionsMenu
      tooltip="Changes screenshot actions"
      ariaLabel="Changes screenshot actions"
    >
      {getCopyImageSubmenu({
        publicUrl: compareScreenshot.url,
        alt: diff.name,
      })}
      <MenuSeparator />
      {getDownloadImageSubmenu(
        <>
          <MenuItem
            icon={<FileDownIcon />}
            onAction={() => {
              downloadWithToast(
                fetchBlob(compareScreenshot.originalUrl).then((blob) => {
                  downloadBlob(blob, getName("head"));
                }),
              );
            }}
          >
            Download screenshot
          </MenuItem>
          {diffUrl ? (
            <>
              <MenuItem
                icon={<BlendIcon />}
                onAction={() => {
                  downloadWithToast(
                    fetchBlob(diffUrl).then((blob) => {
                      downloadBlob(blob, getName("mask"));
                    }),
                  );
                }}
              >
                Download diff mask
              </MenuItem>
              <MenuItem
                icon={<Layers2Icon />}
                onAction={() => {
                  downloadWithToast(
                    createMaskedCompareBlob({
                      compareUrl: compareScreenshot.originalUrl,
                      maskUrl: diffUrl,
                      color: overlayColor,
                      opacity: overlayOpacity,
                    }).then((blob) => {
                      downloadBlob(blob, getName("composite"));
                    }),
                  );
                }}
              >
                Download composed changes
              </MenuItem>
            </>
          ) : null}
        </>,
      )}
    </ImageActionsMenu>
  );
}

function CompareScreenshot(props: {
  diff: BuildDiffDetailDocument;
  build: BuildFragmentDocument;
  blendMode?: BlendViewMode | null;
}) {
  const { diff, build, blendMode = null } = props;
  const buildId = build.id;
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
              <CompareScreenshotActionsMenu diff={diff} buildId={buildId} />
            }
            overlay={
              dimensions
                ? (paneSize) => (
                    <ScreenshotCommentLayer
                      build={build}
                      screenshotDiffId={diff.id}
                      imgSize={dimensions}
                      paneSize={paneSize}
                    />
                  )
                : undefined
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
            <CompareScreenshotActionsMenu diff={diff} buildId={buildId} />
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
            <CompareScreenshotActionsMenu diff={diff} buildId={buildId} />
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
              <CompareScreenshotActionsMenu diff={diff} buildId={buildId} />
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
          icon={getDiffGroupDefinition(diff.status).icon}
        />
      );
    }
    case ScreenshotDiffStatus.Ignored:
    case ScreenshotDiffStatus.Changed: {
      return (
        <CompareScreenshotChanged
          diff={diff}
          build={build}
          contained={contained}
          diffVisible={visible}
          blendMode={blendMode}
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
  build: BuildFragmentDocument;
  diffVisible: boolean;
  contained: boolean;
  blendMode: BlendViewMode | null;
}) {
  const { diff, build, diffVisible, contained, blendMode } = props;
  const buildId = build.id;
  const onionOpacity = useAtomValue(onionOpacityAtom);
  const swipePosition = useAtomValue(swipePositionAtom);
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
  const jpgUrl = useMemo(() => getChangesDetectionUrl(url), [url]);
  return (
    <>
      <div className="relative flex min-h-0 min-w-0 flex-1 select-none">
        <ZoomPane
          ref={paneRef}
          dimensions={dimensions}
          controls={
            <CompareScreenshotActionsMenu diff={diff} buildId={buildId} />
          }
          overlay={
            dimensions
              ? (paneSize) => (
                  <>
                    <ScreenshotCommentLayer
                      build={build}
                      screenshotDiffId={diff.id}
                      imgSize={dimensions}
                      paneSize={paneSize}
                    />
                    {blendMode === "swipe" && paneSize && (
                      <BuildSwipeDivider
                        paneSize={paneSize}
                        imgSize={dimensions}
                      />
                    )}
                  </>
                )
              : undefined
          }
        >
          <ScreenshotContainer dimensions={dimensions} contained={contained}>
            {blendMode && (
              <ScreenshotPicture
                className={clsx(
                  "absolute top-0 left-0 w-full",
                  blendMode === "onion" && diffVisible && "opacity-disabled",
                )}
                alt="Baseline screenshot"
                {...getScreenshotPictureProps(diff.baseScreenshot!)}
              />
            )}
            <ScreenshotPicture
              className={clsx(
                "absolute top-0 left-0",
                blendMode !== "onion" && diffVisible && "opacity-disabled",
              )}
              alt={blendMode ? "Changes screenshot" : undefined}
              style={
                blendMode === "onion"
                  ? {
                      // An inline opacity overrides the `opacity-disabled`
                      // class, so the overlay dimming is folded in here.
                      opacity: diffVisible
                        ? `calc(${onionOpacity} * var(--opacity-disabled))`
                        : onionOpacity,
                    }
                  : blendMode === "swipe"
                    ? { clipPath: `inset(0 0 0 ${swipePosition * 100}%)` }
                    : undefined
              }
              {...getScreenshotPictureProps(diff.compareScreenshot!)}
            />
            <ChangesScreenshotPicture
              className={clsx("relative z-10", contained && "max-h-full")}
              alt="Changes screenshot"
              src={url}
              width={diff.width}
              height={diff.height}
              style={{
                opacity: diffVisible ? undefined : 0,
                // In swipe view, the overlay only applies to the changes
                // side of the divider.
                clipPath:
                  blendMode === "swipe"
                    ? `inset(0 0 0 ${swipePosition * 100}%)`
                    : undefined,
              }}
            />
          </ScreenshotContainer>
        </ZoomPane>
        {dimensions && paneSize && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm">
            <ChangesHighlights
              url={url}
              paneSize={paneSize}
              imgSize={dimensions}
            />
          </div>
        )}
        {blendMode === "onion" && <BuildOnionOpacityControl />}
      </div>
      {dimensions && paneSize && (
        <DiffIndicator url={jpgUrl} imgSize={dimensions} />
      )}
    </>
  );
}

/**
 * The shared swipe divider wired to the build's view-mode atoms.
 */
function BuildSwipeDivider(props: {
  paneSize: { width: number; height: number };
  imgSize: { width: number; height: number };
}) {
  const [position, setPosition] = useAtom(swipePositionAtom);
  const [handleY, setHandleY] = useAtom(swipeHandleYAtom);
  return (
    <SwipeDivider
      {...props}
      position={position}
      onPositionChange={setPosition}
      handleY={handleY}
      onHandleYChange={setHandleY}
    />
  );
}

/**
 * The shared onion-skin slider wired to the build's opacity atom.
 */
function BuildOnionOpacityControl() {
  const [opacity, setOpacity] = useAtom(onionOpacityAtom);
  return <OnionOpacityControl value={opacity} onChange={setOpacity} />;
}

function ChangesScreenshotPicture(props: ScreenshotPictureProps) {
  const imageRendering = useImageRendering();
  return (
    <ChangesMask url={props.src} style={{ imageRendering, ...props.style }}>
      <ScreenshotPicture
        alt="Changes screenshot"
        {...props}
        style={{ opacity: 0, display: "block" }}
      />
    </ChangesMask>
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
  const { rects, loading } = useColoredRects({ url, blockSize: 5 });
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
        // Detecting the changed areas is asynchronous, `aria-busy` tells Argos
        // to wait for it before screenshotting, else the indicator is empty.
        aria-busy={loading}
        className={clsx(
          "bg-ui absolute inset-y-0 -left-3 m-px w-1.5 overflow-hidden rounded-sm",
          loading && "animate-pulse",
        )}
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
    const canBlend = checkDiffCanBeBlended(diff);
    const blendMode =
      checkIsBlendViewMode(viewMode) && canBlend ? viewMode : null;
    // Blend views only apply to comparable image diffs; fall back to the
    // split view for the other diffs.
    const effectiveViewMode =
      checkIsBlendViewMode(viewMode) && !canBlend ? "split" : viewMode;
    const showBaseline =
      effectiveViewMode === "split" || effectiveViewMode === "baseline";
    const showChanges =
      blendMode !== null ||
      effectiveViewMode === "split" ||
      effectiveViewMode === "changes";

    if (
      diff.status === ScreenshotDiffStatus.Changed ||
      diff.status === ScreenshotDiffStatus.Ignored
    ) {
      invariant(diff.compareScreenshot);
      invariant(diff.baseScreenshot);
      if (!checkIsImageContentType(diff.compareScreenshot.contentType)) {
        return (
          // `pt-2`, not `p-4`: the header row tops out level with the right
          // sidebar's Snapshot/Review tabs, which sit 8px into the same region.
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-4 pt-2 pb-4">
            <BuildSnapshotsDiff
              base={{
                url: diff.baseScreenshot.url,
                contentType: diff.baseScreenshot.contentType,
                header: <BaselineScreenshotHeader build={build} />,
              }}
              head={{
                url: diff.compareScreenshot.url,
                contentType: diff.compareScreenshot.contentType,
                header: <ChangesScreenshotHeader build={build} />,
              }}
              build={build}
              screenshotDiffId={diff.id}
            />
          </div>
        );
      }
    }

    const columnClassName =
      "relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 [[hidden]]:hidden";

    return (
      // `pt-2`, not `p-4`: the header row tops out level with the right
      // sidebar's Snapshot/Review tabs, which sit 8px into the same region.
      <div className="flex min-h-0 min-w-0 flex-1 gap-4 px-4 pt-2 pb-4">
        <div className={columnClassName} hidden={!showBaseline}>
          <BaselineScreenshotHeader build={build} />
          <div className="relative flex min-h-0 flex-1 justify-center">
            <ScaleProvider>
              <BaseScreenshot diff={diff} buildId={build.id} />
            </ScaleProvider>
          </div>
        </div>
        <div className={columnClassName} hidden={!showChanges}>
          {blendMode ? (
            <div className="flex shrink-0 justify-center gap-6">
              <BaselineScreenshotHeader build={build} />
              <ChangesScreenshotHeader build={build} />
            </div>
          ) : (
            <ChangesScreenshotHeader build={build} />
          )}
          <div className="relative flex min-h-0 flex-1 justify-center">
            <ScaleProvider>
              <CompareScreenshot
                diff={diff}
                build={build}
                blendMode={blendMode}
              />
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
  // Size the editor to its content instead of stretching to fill the flex row:
  // `self-start` opts out of the row's default `align-items: stretch` so a short
  // snapshot (e.g. a one-line ARIA tree) stays short, while the outer panel
  // (`overflow-y-auto`) scrolls when the content is tall.
  return (
    <EditorContainer>
      <Editor
        value={text}
        language={getLanguageFromContentType(props.contentType)}
      />
    </EditorContainer>
  );
}

function EditorContainer(props: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto rounded border">
      {props.children}
    </div>
  );
}

function DiffSnapshots(props: {
  base: { url: string; contentType: string };
  head: { url: string; contentType: string };
  renderSideBySide: boolean;
  build: BuildFragmentDocument;
  screenshotDiffId: string;
}) {
  const { base, head, renderSideBySide, build, screenshotDiffId } = props;
  const [baseText, headText] = useTextContent([base.url, head.url]);
  return (
    <EditorContainer>
      <DiffCommentLayer
        build={build}
        screenshotDiffId={screenshotDiffId}
        original={baseText}
        originalLanguage={getLanguageFromContentType(base.contentType)}
        modified={headText}
        modifiedLanguage={getLanguageFromContentType(head.contentType)}
        renderSideBySide={renderSideBySide}
      />
    </EditorContainer>
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
  build: BuildFragmentDocument;
  screenshotDiffId: string;
}) {
  const { base, head, build, screenshotDiffId } = props;
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
    // Blend views don't apply to text snapshots; fall back to the split view.
    case "onion":
    case "swipe":
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
      const isSplit = viewMode !== "changes";
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
            <DiffSnapshots
              base={base}
              head={head}
              renderSideBySide={isSplit}
              build={build}
              screenshotDiffId={screenshotDiffId}
            />
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
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const { build, diff, className, ref } = props;
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
        <BuildScreenshots build={build} diff={diff} />
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
