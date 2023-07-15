/* eslint-disable react/no-unescaped-entities */
import { init } from "@sentry/browser";
import { clsx } from "clsx";
import { Selection, select } from "d3-selection";
import { ZoomBehavior, zoom, zoomIdentity } from "d3-zoom";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { checkIsBuildEmpty } from "@/containers/Build";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Code } from "@/ui/Code";
import { Anchor } from "@/ui/Link";
import { Time } from "@/ui/Time";
import { useEventCallback } from "@/ui/useEventCallback";
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
      <div className="flex shrink-0 flex-col items-center gap-0.5 text-on-light">
        <div className="flex max-w-full items-center gap-1">
          <div className="shrink-0 text-xs font-medium">{label} from</div>
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

type ZoomPaneEvent = {
  state: Transform;
  sourceEvent: MouseEvent | TouchEvent | null;
};
type ZoomPaneListener = (event: ZoomPaneEvent) => void;

class Zoomer {
  zoom: ZoomBehavior<Element, unknown>;
  selection: Selection<Element, unknown, null, undefined>;
  listeners: ZoomPaneListener[];

  constructor(element: Element) {
    this.listeners = [];
    this.zoom = zoom().scaleExtent([0.1, 15]);

    this.zoom.on("zoom", (event) => {
      const state: Transform = {
        scale: event.transform.k,
        x: event.transform.x,
        y: event.transform.y,
      };

      this.listeners.forEach((listener) => {
        listener({
          state,
          sourceEvent: event.sourceEvent,
        });
      });
    });
    this.selection = select(element);
    this.selection
      .call(this.zoom)
      // Always prevent scrolling on wheel input regardless of the scale extent
      .on("wheel", (event) => event.preventDefault());
  }

  update(state: Transform): void {
    this.zoom.transform(
      this.selection,
      zoomIdentity.translate(state.x, state.y).scale(state.scale)
    );
  }

  subscribe(listener: ZoomPaneListener): () => void {
    this.listeners.push(listener);
    const unsubscribe = () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
    return unsubscribe;
  }
}

type ZoomerSyncContextValue = {
  register: (instance: Zoomer) => () => void;
};

const ZoomerSyncContext = createContext<ZoomerSyncContextValue | null>(null);

const ZoomerSyncProvider = (props: { children: React.ReactNode }) => {
  const refInstances = useRef<Zoomer[]>([]);
  const register = useCallback((zoomer: Zoomer) => {
    refInstances.current.push(zoomer);
    const unsubscribe = zoomer.subscribe((event) => {
      if (event.sourceEvent) {
        refInstances.current.forEach((i) => {
          if (i !== zoomer) {
            i.update(event.state);
          }
        });
      }
    });
    return () => {
      refInstances.current = refInstances.current.filter((i) => i !== zoomer);
      unsubscribe();
    };
  }, []);
  const value = useMemo(() => ({ register }), [register]);
  return (
    <ZoomerSyncContext.Provider value={value}>
      {props.children}
    </ZoomerSyncContext.Provider>
  );
};

const useZoomerSyncContext = () => {
  const ctx = useContext(ZoomerSyncContext);
  if (!ctx) {
    throw new Error("Missing ZoomerSyncProvider");
  }
  return ctx;
};

type Transform = {
  scale: number;
  x: number;
  y: number;
};

const checkIsTransformEqual = (a: Transform, b: Transform): boolean => {
  return a.scale === b.scale && a.x === b.x && a.y === b.y;
};

const transformToCss = (transform: Transform): string => {
  return `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
};

const identityTransform: Transform = {
  scale: 1,
  x: 0,
  y: 0,
};

const ZoomPane = (props: { children: React.ReactNode }) => {
  const paneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { register } = useZoomerSyncContext();
  const [transform, setTransform] = useState<Transform>(identityTransform);
  useLayoutEffect(() => {
    const pane = paneRef.current as Element;
    const paneRect = pane.getBoundingClientRect();
    const content = contentRef.current as Element;
    const contentRect = content.getBoundingClientRect();
    const initialTransform: Transform = {
      scale: 1,
      x: paneRect.width / 2 - contentRect.width / 2,
      y: 0,
    };
    const zoomer = new Zoomer(pane);
    zoomer.subscribe((event) => {
      setTransform((previous) => {
        if (checkIsTransformEqual(previous, event.state)) {
          return previous;
        }
        return event.state;
      });
    });
    zoomer.update(initialTransform);
    return register(zoomer);
  }, [register]);
  return (
    <div
      ref={paneRef}
      className="flex min-h-0 flex-1 cursor-grab overflow-hidden bg-zinc-800/50"
    >
      <div
        ref={contentRef}
        className="relative origin-top-left"
        style={{ transform: transformToCss(transform) }}
      >
        {props.children}
      </div>
    </div>
  );
};

const ConditionalZoomPane = (props: { children: React.ReactNode }) => {
  const { contained } = useBuildDiffFitState();
  if (contained) {
    return <ZoomPane>{props.children}</ZoomPane>;
  }
  return <div className="relative">{props.children}</div>;
};

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
        <ConditionalZoomPane key={diff.id}>
          {/* <NeutralLink href={diff.baseScreenshot!.url}> */}
          <img
            className="max-h-full"
            alt="Baseline screenshot"
            {...getImgAttributes(diff.baseScreenshot!)}
          />
          {/* </NeutralLink> */}
        </ConditionalZoomPane>
      );
    case "changed":
      return (
        <ConditionalZoomPane key={diff.id}>
          {/* <NeutralLink href={diff.baseScreenshot!.url}> */}
          <img
            className="relative max-h-full opacity-0"
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
          {/* </NeutralLink> */}
        </ConditionalZoomPane>
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
        // <div>
        <ConditionalZoomPane key={diff.id}>
          {/* <NeutralLink href={diff.compareScreenshot!.url}> */}
          <img
            className="max-h-full"
            alt="Changes screenshot"
            {...getImgAttributes(diff.compareScreenshot!)}
          />
          {/* </NeutralLink> */}
        </ConditionalZoomPane>
        // </div>
      );
    case "failure":
      return (
        // <div>
        <ConditionalZoomPane key={diff.id}>
          {/* <NeutralLink href={diff.compareScreenshot!.url}> */}
          <img
            className="max-h-full"
            alt="Failure screenshot"
            {...getImgAttributes(diff.compareScreenshot!)}
          />
          {/* </NeutralLink> */}
        </ConditionalZoomPane>
        // </div>
      );
    case "unchanged":
      return (
        <div>
          <NeutralLink href={diff.compareScreenshot!.url}>
            <img
              className="max-h-full"
              alt="Baseline screenshot"
              {...getImgAttributes(diff.compareScreenshot!)}
            />
          </NeutralLink>
        </div>
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
        <ConditionalZoomPane key={diff.id}>
          {/* <NeutralLink href={diff.compareScreenshot!.url}> */}
          <img
            className="absolute"
            {...getImgAttributes(diff.compareScreenshot!)}
          />
          <div
            className={clsx(opacity, "absolute inset-0 bg-black bg-opacity-70")}
          />

          <img
            className={clsx(opacity, "relative z-10 max-h-full")}
            alt="Changes screenshot"
            {...getImgAttributes({
              url: diff.url!,
              width: diff.width,
              height: diff.height,
            })}
          />
          {/* </NeutralLink> */}
        </ConditionalZoomPane>
      );
    default:
      return null;
  }
};

const BuildScreenshots = memo(
  (props: { diff: Diff; build: BuildFragmentDocument }) => {
    const { contained } = useBuildDiffFitState();
    const { viewMode } = useBuildDiffViewModeState();
    const showBaseline = viewMode === "split" || viewMode === "baseline";
    const showChanges = viewMode === "split" || viewMode === "changes";

    return (
      <ZoomerSyncProvider>
        <div className={clsx(contained && "min-h-0 flex-1", "flex gap-4 px-4")}>
          {props.build.baseScreenshotBucket && showBaseline ? (
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4">
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
          {showChanges ? (
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4">
              <BuildScreenshotHeader
                label="Changes"
                branch={props.build.branch}
                date={props.build.createdAt}
              />
              <div className="relative flex min-h-0 flex-1 justify-center">
                <CompareScreenshot diff={props.diff} />
              </div>
            </div>
          ) : null}
        </div>
      </ZoomerSyncProvider>
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
            <BuildDiffViewModeStateProvider>
              <BuildDetailToolbar
                name={activeDiff.name}
                bordered={scrolled}
                test={activeDiff.test ?? null}
              />
              <BuildScreenshots build={build} diff={activeDiff} />
            </BuildDiffViewModeStateProvider>
          </BuildDiffFitStateProvider>
        </BuildDiffVisibleStateProvider>
      ) : checkIsBuildEmpty(build) ? (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center">
          <div className="m-4 max-w-2xl rounded-lg border border-info-600 p-8 text-center text-info-500">
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
