/* eslint-disable react/no-unescaped-entities */
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
  state: TransformState;
  sourceEvent: MouseEvent | TouchEvent | null;
};
type ZoomPaneListener = (event: ZoomPaneEvent) => void;

class ZoomPane {
  zoom: ZoomBehavior<Element, unknown>;
  selection: Selection<Element, unknown, null, undefined>;
  listeners: ZoomPaneListener[];

  constructor(element: Element) {
    this.listeners = [];

    this.zoom = zoom();
    this.zoom.on("zoom", (event) => {
      const state: TransformState = {
        scale: event.transform.k,
        positionX: event.transform.x,
        positionY: event.transform.y,
      };

      this.listeners.forEach((listener) => {
        listener({
          state,
          sourceEvent: event.sourceEvent,
        });
      });
    });
    this.selection = select(element);
    this.selection.call(this.zoom);
  }

  update(state: TransformState): void {
    this.zoom.transform(
      this.selection,
      zoomIdentity
        .translate(state.positionX, state.positionY)
        .scale(state.scale)
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

type CoordinatorContextValue = {
  register: (instance: ZoomPane) => () => void;
};

const CoordinatorContext = createContext<CoordinatorContextValue | null>(null);

const CoordinatorProvider = (props: { children: React.ReactNode }) => {
  const refInstances = useRef<ZoomPane[]>([]);
  const register = useCallback((instance: ZoomPane) => {
    refInstances.current.push(instance);
    const unsubscribe = instance.subscribe((event) => {
      if (event.sourceEvent) {
        refInstances.current.forEach((i) => {
          if (i !== instance) {
            i.update(event.state);
          }
        });
      }
    });
    return () => {
      refInstances.current = refInstances.current.filter((i) => i !== instance);
      unsubscribe();
    };
  }, []);
  const value = useMemo(() => ({ register }), [register]);
  return (
    <CoordinatorContext.Provider value={value}>
      {props.children}
    </CoordinatorContext.Provider>
  );
};

const useCoordinatorContext = () => {
  const ctx = useContext(CoordinatorContext);
  if (!ctx) {
    throw new Error("Missing CoordinatorProvider");
  }
  return ctx;
};

type TransformState = {
  scale: number;
  positionX: number;
  positionY: number;
};

const checkIsTransformStateEqual = (
  a: TransformState,
  b: TransformState
): boolean => {
  return (
    a.scale === b.scale &&
    a.positionX === b.positionX &&
    a.positionY === b.positionY
  );
};

const Transform = (props: { children: React.ReactNode }) => {
  const zoomPaneRef = useRef<HTMLDivElement>(null);
  const { register } = useCoordinatorContext();
  const [transformState, setTransformState] = useState<TransformState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });
  const getTransformState = useEventCallback(() => transformState);
  useEffect(() => {
    const zoomPane = new ZoomPane(zoomPaneRef.current as Element);
    zoomPane.subscribe((event) => {
      setTransformState((previous) => {
        if (checkIsTransformStateEqual(previous, event.state)) {
          return previous;
        }
        return event.state;
      });
    });
    return register(zoomPane);
  }, [register, getTransformState]);
  return (
    <div
      ref={zoomPaneRef}
      className="flex min-h-0 flex-1 cursor-grab overflow-hidden bg-zinc-800/50"
    >
      <div
        className="relative origin-top-left"
        style={{
          transform: `translate(${transformState.positionX}px, ${transformState.positionY}px) scale(${transformState.scale})`,
        }}
      >
        {props.children}
      </div>
    </div>
  );
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
        <div>
          <NeutralLink href={diff.baseScreenshot!.url}>
            <img
              className="max-h-full"
              alt="Baseline screenshot"
              {...getImgAttributes(diff.baseScreenshot!)}
            />
          </NeutralLink>
        </div>
      );
    case "changed":
      return (
        <Transform key={diff.id}>
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
        </Transform>
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
              {...getImgAttributes(diff.compareScreenshot!)}
            />
          </NeutralLink>
        </div>
      );
    case "failure":
      return (
        <div>
          <NeutralLink href={diff.compareScreenshot!.url}>
            <img
              className="max-h-full"
              alt="Failure screenshot"
              {...getImgAttributes(diff.compareScreenshot!)}
            />
          </NeutralLink>
        </div>
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
        <Transform key={diff.id}>
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
        </Transform>
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
      <CoordinatorProvider>
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
      </CoordinatorProvider>
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
