import { ComponentPropsWithRef, memo, Suspense } from "react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  AriaButtonProps,
  HoverProps,
  useButton,
  useObjectRef,
} from "react-aria";

import { useOverlayStyle } from "@/containers/Build/OverlayStyle";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { ImageKitPicture, ImageKitPictureProps } from "@/ui/ImageKitPicture";
import { Truncable, type TruncableProps } from "@/ui/Truncable";
import { checkIsImageContentType } from "@/util/content-type";

import type { BuildDiffDetailDocument } from "./BuildDiffDetail";
import { RemoteMinimap } from "./RemoteMinimap";

interface DiffImageProps {
  diff: BuildDiffDetailDocument;
  config: GetDiffDimensionsConfig;
}

export const DiffImage = memo(function DiffImage(props: DiffImageProps) {
  const { diff, config } = props;
  const dimensions = getDiffDimensions(diff, config);

  switch (diff.status) {
    case ScreenshotDiffStatus.Added:
    case ScreenshotDiffStatus.Unchanged:
    case ScreenshotDiffStatus.Failure:
    case ScreenshotDiffStatus.RetryFailure: {
      invariant(diff.compareScreenshot);
      return (
        <SingleImage
          contentType={diff.compareScreenshot.contentType}
          url={diff.compareScreenshot.url}
          dimensions={dimensions}
        />
      );
    }
    case ScreenshotDiffStatus.Removed: {
      invariant(diff.baseScreenshot);
      return (
        <SingleImage
          contentType={diff.baseScreenshot.contentType}
          url={diff.baseScreenshot.url}
          dimensions={dimensions}
        />
      );
    }
    case ScreenshotDiffStatus.Ignored:
    case ScreenshotDiffStatus.Changed: {
      invariant(diff.compareScreenshot);
      return (
        <OverlayImage
          headURL={diff.compareScreenshot.url}
          contentType={diff.compareScreenshot.contentType}
          diffURL={diff.url ?? null}
          dimensions={dimensions}
        />
      );
    }
    case ScreenshotDiffStatus.Pending:
      return null;
    default:
      assertNever(diff.status);
  }
});

/**
 * Renders an overlay of two images: the "head" image with the "diff" image on top.
 */
function OverlayImage(props: {
  contentType: string;
  headURL: string;
  diffURL: string | null;
  dimensions: Dimensions;
}) {
  const { headURL, diffURL, contentType, dimensions } = props;
  if (checkIsImageContentType(contentType) && diffURL) {
    const { key: compareKey, ...compareAttrs } = getImgAttributes(headURL);
    const { key: diffKey, ...diffAttrs } = getImgAttributes(
      diffURL,
      dimensions,
    );
    return (
      <div className="flex h-full items-center justify-center">
        <div
          className="relative"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <ImageKitPicture
            key={compareKey}
            {...compareAttrs}
            className="opacity-disabled absolute top-0 w-full"
          />
          <DiffPicture
            key={diffKey}
            {...diffAttrs}
            className="relative z-10 max-h-full w-full"
          />
        </div>
      </div>
    );
  }
  return (
    <SingleImage
      contentType={contentType}
      url={headURL}
      dimensions={dimensions}
    />
  );
}

/**
 * Renders a single image without any diff overlay.
 */
function SingleImage(props: {
  contentType: string;
  url: string;
  dimensions: Dimensions;
}) {
  const { contentType, url, dimensions } = props;
  const className = "max-h-full max-w-full object-contain";
  if (checkIsImageContentType(contentType)) {
    const { key, ...attrs } = getImgAttributes(url, dimensions);
    return <ImageKitPicture key={key} {...attrs} className={className} />;
  }
  return (
    <Suspense fallback={null}>
      <RemoteMinimap {...dimensions} url={url} className={className} />
    </Suspense>
  );
}

function DiffPicture(props: ImageKitPictureProps) {
  const style = useOverlayStyle({ src: props.src });
  return (
    <span className="z-10" style={{ ...style, ...props.style }}>
      <ImageKitPicture {...props} style={{ opacity: 0, display: "block" }} />
    </span>
  );
}

export interface DiffCardProps {
  isActive: boolean;
  variant: "success" | "danger" | "primary";
  className?: string;
  children: React.ReactNode;
}

export function DiffCard(props: DiffCardProps) {
  const { isActive, variant, children, className } = props;
  const ring = (() => {
    switch (variant) {
      case "success":
        return isActive
          ? "ring-3 ring-inset ring-success-active"
          : children
            ? "ring-1 ring-inset ring-success group-hover/item:ring-success-hover"
            : "";
      case "danger":
        return isActive
          ? "ring-3 ring-inset ring-danger-active"
          : children
            ? "ring-1 ring-inset ring-danger group-hover/item:ring-danger-hover"
            : "";
      case "primary":
        return isActive
          ? "ring-3 ring-inset ring-primary-active"
          : children
            ? "ring-1 ring-inset ring-primary group-hover/item:ring-primary-hover"
            : "";
      default:
        assertNever(variant);
    }
  })();

  return (
    <div
      className={clsx(
        "bg-app relative flex h-full items-center justify-center overflow-hidden rounded-lg",
        className,
      )}
    >
      {children}
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 z-20 rounded-lg",
          ring,
        )}
      />
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 z-20 rounded-lg",
          isActive && "ring-1 ring-(--violet-12) ring-inset",
        )}
      />
    </div>
  );
}

export function ListItemButton(
  props: Pick<AriaButtonProps<"div">, "onPress" | "isDisabled"> &
    Pick<HoverProps, "onHoverChange"> &
    ComponentPropsWithRef<"div">,
) {
  const { ref: propRef, onPress, isDisabled, className, ...rest } = props;
  const ref = useObjectRef(propRef);
  const { buttonProps } = useButton(
    {
      elementType: "div",
      onPress,
      isDisabled,
    },
    ref,
  );
  return (
    <div
      ref={ref}
      className={clsx(
        "group/item relative cursor-default text-left focus:outline-hidden",
        className,
      )}
      {...rest}
      {...buttonProps}
    />
  );
}

interface DiffCardFooterProps extends ComponentPropsWithRef<"div"> {
  alwaysVisible?: boolean;
}

export function DiffCardFooter(props: DiffCardFooterProps) {
  const { alwaysVisible, ...rest } = props;
  return (
    <div
      {...rest}
      className={clsx(
        "bg-app absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 truncate px-2",
        alwaysVisible
          ? null
          : "opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/sidebar:opacity-100",
        rest.className,
      )}
    />
  );
}

export function DiffCardFooterText(props: TruncableProps) {
  return (
    <Truncable
      {...props}
      className={clsx(
        "bg-app text-xxs flex-1 pt-1 pb-1.5 font-medium",
        props.className,
      )}
    />
  );
}

type Dimensions = {
  width: number;
  height: number;
};

function constraint(size: Dimensions, constraints: Constraints) {
  const wp = constraints.maxWidth / size.width;
  const hp = constraints.maxHeight / size.height;
  const ratio = Math.min(wp, hp, 1);
  return {
    width: Math.round(size.width * ratio),
    height: Math.round(size.height * ratio),
  };
}

type Constraints = {
  maxWidth: number;
  maxHeight: number;
};

type GetDiffDimensionsConfig = Constraints & {
  defaultHeight: number;
};

export function getDiffDimensions(
  diff: BuildDiffDetailDocument | null,
  config: GetDiffDimensionsConfig,
) {
  if (diff && diff.width != null && diff.height != null) {
    return constraint(
      {
        width: diff.width,
        height: diff.height,
      },
      config,
    );
  }

  if (
    diff &&
    diff.compareScreenshot &&
    diff.compareScreenshot.width != null &&
    diff.compareScreenshot.height != null
  ) {
    return constraint(
      {
        width: diff.compareScreenshot.width,
        height: diff.compareScreenshot.height,
      },
      config,
    );
  }

  if (
    diff &&
    diff.baseScreenshot &&
    diff.baseScreenshot.width != null &&
    diff.baseScreenshot.height != null
  ) {
    return constraint(
      {
        width: diff.baseScreenshot.width,
        height: diff.baseScreenshot.height,
      },
      config,
    );
  }

  return { height: config.defaultHeight, width: config.maxWidth };
}

function getImgAttributes(
  url: string,
  dimensions?: { width: number; height: number },
) {
  return {
    key: url,
    src: url,
    width: dimensions?.width,
    height: dimensions?.height,
    parameters: dimensions
      ? [`w-${dimensions.width}`, `h-${dimensions.height}`, `c-at_max`, `dpr-2`]
      : [],
  };
}
