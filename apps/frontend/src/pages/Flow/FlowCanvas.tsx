import { useCallback, useEffect, useMemo, useState } from "react";
import { useApolloClient, useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ChevronRightIcon, EyeOffIcon, WaypointsIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import {
  getDiffGroupDefinition,
  type DiffGroupColor,
} from "@/containers/Build/BuildDiffGroup";
import { ScaleProvider } from "@/containers/Build/ScaleContext";
import { ZoomerSyncProvider, ZoomPane } from "@/containers/Build/Zoomer";
import { graphql, type DocumentType } from "@/gql";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip, ChipButton } from "@/ui/Chip";
import { Heading } from "@/ui/Heading";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  Page,
  PageContainer,
} from "@/ui/Layout";
import { Link as UILink } from "@/ui/Link";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { PageLoader } from "@/ui/PageLoader";
import { Select, SelectButton } from "@/ui/Select";
import { Text } from "@/ui/Text";
import { Tooltip } from "@/ui/Tooltip";
import { useResizeObserver } from "@/ui/useResizeObserver";
import {
  getDefaultVariantSelection,
  getJourneyDims,
  getVariantDims,
  groupJourneys,
  type Journey,
  type JourneyDims,
  type VariantSelection,
} from "@/util/flow-model";

import { getBuildURL } from "../Build/BuildParams";
import { BrowserIcon } from "../Build/metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../Build/metadata/browser/browserLabels";
import {
  colorSchemeIcons,
  getViewportIconKind,
  viewportIcons,
} from "../Build/metadata/metadataIcons";
import { NotFound } from "../NotFound";
import { ProjectTitle } from "../Project/ProjectTitle";
import { getFlowsURL, useFlowParams, type FlowParams } from "./FlowParams";
import {
  buildStoryboard,
  countChanges,
  type StoryboardKind,
  type StoryboardRow,
} from "./storyboard";

const ProjectQuery = graphql(`
  query FlowCanvas_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      latestBuild {
        id
        number
      }
      builds(first: 30) {
        edges {
          id
          number
          branch
        }
      }
    }
  }
`);

const _ScreenshotFragment = graphql(`
  fragment FlowCanvas_Screenshot on Screenshot {
    id
    url
    width
    height
    contentType
    metadata {
      viewport {
        width
      }
      browser {
        name
      }
      colorScheme
      test {
        titlePath
      }
      story {
        id
      }
      capture {
        index
      }
    }
  }
`);

const BuildQuery = graphql(`
  query FlowCanvas_build(
    $accountSlug: String!
    $projectName: String!
    $buildNumber: Int!
    $after: Int!
    $first: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      build(number: $buildNumber) {
        id
        number
        branch
        baseBranch
        baseBuild {
          id
          number
          branch
        }
        screenshotDiffs(after: $after, first: $first) {
          pageInfo {
            hasNextPage
          }
          edges {
            id
            name
            variantKey
            parentName
            status
            baseScreenshot {
              ...FlowCanvas_Screenshot
            }
            compareScreenshot {
              ...FlowCanvas_Screenshot
            }
          }
        }
      }
    }
  }
`);

type BuildQueryResult = DocumentType<typeof BuildQuery>;
type Build = NonNullable<NonNullable<BuildQueryResult["project"]>["build"]>;
type Diff = Build["screenshotDiffs"]["edges"][number];
type Screenshot = DocumentType<typeof _ScreenshotFragment>;

/**
 * Loads every diff of a build, page by page, the way the review does. The
 * component using it is keyed by the build number, so a change of build
 * starts over.
 */
function useBuildDiffs(params: FlowParams, buildNumber: number) {
  const apolloClient = useApolloClient();
  const [error, setError] = useState<unknown>(null);
  if (error) {
    throw error;
  }
  const [state, setState] = useState<{
    build: Build | null | undefined;
    diffs: Diff[];
    hasMore: boolean;
  }>({ build: undefined, diffs: [], hasMore: true });
  useEffect(() => {
    if (!state.hasMore) {
      return;
    }
    let outdated = false;
    apolloClient
      .query({
        query: BuildQuery,
        fetchPolicy: "no-cache",
        variables: {
          accountSlug: params.accountSlug,
          projectName: params.projectName,
          buildNumber,
          after: state.diffs.length,
          first: 100,
        },
      })
      .then((result) => {
        if (outdated) {
          return;
        }
        const build = result.data?.project?.build ?? null;
        setState((previous) => ({
          build,
          diffs: [...previous.diffs, ...(build?.screenshotDiffs.edges ?? [])],
          hasMore: build?.screenshotDiffs.pageInfo.hasNextPage ?? false,
        }));
      })
      .catch((error) => {
        if (!outdated) {
          setError(error);
        }
      });
    return () => {
      outdated = true;
    };
  }, [
    apolloClient,
    params.accountSlug,
    params.projectName,
    buildNumber,
    state.hasMore,
    state.diffs.length,
  ]);
  return state;
}

function getDiffMetadata(diff: Diff) {
  return (
    diff.compareScreenshot?.metadata ?? diff.baseScreenshot?.metadata ?? null
  );
}

function describeDiff(diff: Diff) {
  return {
    hasCompare: diff.compareScreenshot !== null,
    hasBase: diff.baseScreenshot !== null,
    unchanged: diff.status === ScreenshotDiffStatus.Unchanged,
    dims: getVariantDims(getDiffMetadata(diff)),
  };
}

/** The screenshot shown in the lane: the build's, or the baseline's once gone. */
function getLaneScreenshot(diff: Diff): Screenshot | null {
  return diff.compareScreenshot ?? diff.baseScreenshot;
}

const ONLY_CHANGES_STORAGE_KEY = "preferences.flow.only-changes";

function useOnlyChanges() {
  const [onlyChanges, setState] = useState(
    () => localStorage.getItem(ONLY_CHANGES_STORAGE_KEY) === "true",
  );
  const setOnlyChanges = useCallback((value: boolean) => {
    localStorage.setItem(ONLY_CHANGES_STORAGE_KEY, String(value));
    setState(value);
  }, []);
  return [onlyChanges, setOnlyChanges] as const;
}

/** Geometry of the lane at scale 1, in CSS px. */
const LANE = {
  /** Room around the lane, so the fit leaves a margin. */
  padding: 32,
  /** Between two steps, holding the arrow. */
  gap: 40,
  /** The label row above each image. */
  label: 28,
  /** The dashed connector between a step and its hanging baseline. */
  connector: 20,
  /** The caption under a hanging baseline or an added step. */
  caption: 22,
  /** Width of a folded (unchanged) step relative to its height. */
  foldedAspect: 0.3,
  minHeight: 120,
  maxHeight: 640,
};

function getAspect(screenshot: Screenshot | null): number {
  if (!screenshot || !screenshot.width || !screenshot.height) {
    return 0.75;
  }
  return screenshot.width / screenshot.height;
}

function getRowAspect(row: StoryboardRow<Diff>): number {
  return row.collapsed
    ? LANE.foldedAspect
    : getAspect(getLaneScreenshot(row.diff));
}

/**
 * The height of a step image so the whole lane fits the pane at scale 1 —
 * the "fit" the pane resets to. Hanging baselines double the lane's height.
 */
function getCellHeight(
  rows: StoryboardRow<Diff>[],
  pane: { width: number; height: number },
): number {
  const hasHanging = rows.some((row) => row.kind === "changed");
  const totalAspect = rows.reduce((sum, row) => sum + getRowAspect(row), 0);
  const widthBound =
    (pane.width - LANE.padding * 2 - LANE.gap * Math.max(0, rows.length - 1)) /
    Math.max(totalAspect, 0.1);
  const heightBound =
    (pane.height -
      LANE.padding * 2 -
      LANE.label -
      LANE.caption -
      (hasHanging ? LANE.connector : 0)) /
    (hasHanging ? 2 : 1);
  return Math.round(
    Math.min(
      LANE.maxHeight,
      Math.max(LANE.minHeight, Math.min(widthBound, heightBound)),
    ),
  );
}

const KIND_STATUS: Record<
  Exclude<StoryboardKind, "unchanged">,
  | ScreenshotDiffStatus.Changed
  | ScreenshotDiffStatus.Added
  | ScreenshotDiffStatus.Removed
> = {
  changed: ScreenshotDiffStatus.Changed,
  added: ScreenshotDiffStatus.Added,
  removed: ScreenshotDiffStatus.Removed,
};

// Border tokens rather than ring ones: there is no warning ring, and the
// three frames should read as the same weight of the same family.
const FRAME_CLASSNAMES: Record<DiffGroupColor, string> = {
  warning: "ring-2 ring-(--border-color-warning-hover)",
  success: "ring-2 ring-(--border-color-success-hover)",
  danger: "ring-2 ring-(--border-color-danger-hover)",
  neutral: "",
};

function StepImage(props: {
  screenshot: Screenshot;
  height: number;
  className?: string;
  /** Crop from the top instead of showing the whole capture. */
  folded?: boolean;
}) {
  const { screenshot, height, className, folded = false } = props;
  const width = Math.round(
    height * (folded ? LANE.foldedAspect : getAspect(screenshot)),
  );
  return (
    <ImageKitPicture
      src={screenshot.url}
      // Twice the rendered box, so zooming in keeps some definition.
      transformations={
        folded
          ? [`w-${width * 2}`, `h-${height * 2}`, "fo-top"]
          : [`h-${height * 2}`]
      }
      className={clsx(
        "block rounded-sm border bg-white",
        folded ? "object-cover object-top" : "object-contain",
        className,
      )}
      style={{ width, height }}
      alt=""
      draggable={false}
    />
  );
}

function StepCell(props: {
  row: StoryboardRow<Diff>;
  height: number;
  params: FlowParams;
  build: Build;
  last: boolean;
}) {
  const { row, height, params, build, last } = props;
  const screenshot = getLaneScreenshot(row.diff);
  invariant(screenshot, "a diff always has a screenshot on one side");
  const definition =
    row.kind === "unchanged"
      ? null
      : getDiffGroupDefinition(KIND_STATUS[row.kind]);
  const href = getBuildURL({
    ...params,
    buildNumber: build.number,
    diffId: row.diff.id,
  });
  return (
    <div
      className="flex shrink-0 items-start"
      style={{ marginRight: last ? 0 : LANE.gap }}
      data-flow-step={row.key}
      data-flow-step-kind={row.kind}
    >
      <div className="flex flex-col items-center">
        <div
          className="flex items-center gap-1.5 text-xs whitespace-nowrap"
          style={{ height: LANE.label }}
        >
          <span className={clsx(row.collapsed && "max-w-16 truncate")}>
            <span className="text-low">{row.position} · </span>
            {row.label}
          </span>
          {definition && !row.collapsed ? (
            <Chip scale="xs" color={definition.color} icon={definition.icon}>
              {definition.label}
            </Chip>
          ) : null}
        </div>
        <Link to={href} title={`Open ${row.diff.name} in the build review`}>
          <StepImage
            screenshot={screenshot}
            height={height}
            folded={row.collapsed}
            className={clsx(
              row.kind === "unchanged" && "opacity-60",
              row.kind === "removed" && "opacity-60 grayscale",
              definition &&
                !row.collapsed &&
                FRAME_CLASSNAMES[definition.color],
            )}
          />
        </Link>
        {row.kind === "added" ? (
          <div
            className="text-low flex items-center text-xs"
            style={{ height: LANE.caption }}
          >
            not in baseline
          </div>
        ) : null}
        {row.kind === "changed" && row.diff.baseScreenshot ? (
          <>
            <div
              className="border-warning-hover border-l border-dashed"
              style={{ height: LANE.connector }}
            />
            <Link to={href} title={`Open ${row.diff.name} in the build review`}>
              <StepImage
                screenshot={row.diff.baseScreenshot}
                height={height}
                className="opacity-60"
              />
            </Link>
            <div
              className="text-low flex items-center text-xs whitespace-nowrap"
              style={{ height: LANE.caption }}
            >
              before ·{" "}
              {build.baseBranch ?? build.baseBuild?.branch ?? "baseline"}
              {build.baseBuild ? ` #${build.baseBuild.number}` : ""}
            </div>
          </>
        ) : null}
      </div>
      {!last ? (
        <ChevronRightIcon
          className="text-low shrink-0"
          style={{ marginTop: LANE.label + height / 2 - 8, marginLeft: 12 }}
          size={16}
        />
      ) : null}
    </div>
  );
}

/**
 * The journey of one build, laid out horizontally on a pannable canvas: the
 * build's screens in the lane, the baseline of a changed step hanging below.
 * Sized so the whole lane fits the pane at scale 1 — the pane's "fit".
 */
function Lane(props: {
  rows: StoryboardRow<Diff>[];
  params: FlowParams;
  build: Build;
}) {
  const { rows, params, build } = props;
  const [paneSize, setPaneSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const paneRef = useResizeObserver((entry) => {
    setPaneSize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    });
  });
  const height = paneSize ? getCellHeight(rows, paneSize) : LANE.minHeight;
  const hasHanging = rows.some((row) => row.kind === "changed");
  const laneHeight =
    LANE.label +
    height +
    LANE.caption +
    (hasHanging ? LANE.connector + height : 0) +
    LANE.padding * 2;
  const laneWidth =
    rows.reduce((sum, row) => sum + Math.round(height * getRowAspect(row)), 0) +
    LANE.gap * Math.max(0, rows.length - 1) +
    LANE.padding * 2;
  return (
    <div
      ref={paneRef}
      className="bg-subtle flex min-h-0 min-w-0 flex-1"
      data-testid="flow-canvas"
    >
      <ZoomerSyncProvider id={`${params.flowKey}:${build.id}:${rows.length}`}>
        <ScaleProvider>
          <ZoomPane
            surface="bare"
            dimensions={{ width: laneWidth, height: laneHeight }}
            controls={<></>}
          >
            <div
              className="flex shrink-0 self-center"
              style={{
                width: laneWidth,
                height: laneHeight,
                padding: LANE.padding,
              }}
            >
              {rows.map((row, index) => (
                <StepCell
                  key={row.key}
                  row={row}
                  height={height}
                  params={params}
                  build={build}
                  last={index === rows.length - 1}
                />
              ))}
            </div>
          </ZoomPane>
        </ScaleProvider>
      </ZoomerSyncProvider>
    </div>
  );
}

function VariantGroups(props: {
  dims: JourneyDims;
  selection: VariantSelection;
  onChange: (selection: Partial<VariantSelection>) => void;
}) {
  const { dims, selection, onChange } = props;
  return (
    <>
      {dims.browsers.length > 1 && (
        <ButtonGroup>
          {dims.browsers.map((browser) => (
            <Tooltip key={browser} content={getBrowserLabel(browser)}>
              <ChipButton
                icon={<BrowserIcon browser={{ name: browser }} />}
                aria-current={
                  selection.browser === browser ? "page" : undefined
                }
                onClick={() => onChange({ browser })}
              >
                {getBrowserLabel(browser)}
              </ChipButton>
            </Tooltip>
          ))}
        </ButtonGroup>
      )}
      {dims.viewports.length > 1 && (
        <ButtonGroup>
          {dims.viewports.map((viewport) => (
            <Tooltip key={viewport} content={`Viewport width of ${viewport}px`}>
              <ChipButton
                icon={viewportIcons[getViewportIconKind(viewport)]}
                aria-current={
                  selection.viewport === viewport ? "page" : undefined
                }
                onClick={() => onChange({ viewport })}
              >
                {viewport}
              </ChipButton>
            </Tooltip>
          ))}
        </ButtonGroup>
      )}
      {dims.schemes.length > 1 && (
        <ButtonGroup>
          {dims.schemes.map((scheme) => (
            <Tooltip key={scheme} content={`${scheme} color scheme`}>
              <ChipButton
                icon={colorSchemeIcons[scheme]}
                aria-current={selection.scheme === scheme ? "page" : undefined}
                onClick={() => onChange({ scheme })}
              >
                {scheme === "dark" ? "Dark" : "Light"}
              </ChipButton>
            </Tooltip>
          ))}
        </ButtonGroup>
      )}
    </>
  );
}

function BuildSelect(props: {
  builds: { number: number; branch: string | null }[];
  value: number;
  onChange: (number: number) => void;
}) {
  const { builds, value, onChange } = props;
  const options = builds.some((build) => build.number === value)
    ? builds
    : [{ number: value, branch: null }, ...builds];
  return (
    <Select
      aria-label="Build"
      value={String(value)}
      onValueChange={(next) => {
        if (next !== null) {
          onChange(Number(next));
        }
      }}
    >
      <SelectButton size="sm" className="text-sm whitespace-nowrap">
        Build #{value}
      </SelectButton>
      <ListBox>
        {options.map((build) => (
          <ListBoxItem key={build.number} value={String(build.number)}>
            <ListBoxItemLabel>
              #{build.number}
              {build.branch ? ` · ${build.branch}` : ""}
            </ListBoxItemLabel>
          </ListBoxItem>
        ))}
      </ListBox>
    </Select>
  );
}

function Storyboard(props: {
  params: FlowParams;
  buildNumber: number;
  builds: { number: number; branch: string | null }[];
  onBuildChange: (number: number) => void;
}) {
  const { params, buildNumber, builds, onBuildChange } = props;
  const { build, diffs, hasMore } = useBuildDiffs(params, buildNumber);
  const [onlyChanges, setOnlyChanges] = useOnlyChanges();
  const journeys = useMemo(
    () =>
      groupJourneys(
        diffs.filter((diff) => diff.parentName === null),
        (diff) => ({
          variantKey: diff.variantKey,
          metadata: getDiffMetadata(diff),
        }),
      ),
    [diffs],
  );
  const journey: Journey<Diff> | null =
    journeys.find((candidate) => candidate.identity.key === params.flowKey) ??
    null;
  const dims = useMemo(
    () =>
      getJourneyDims(
        (journey?.steps ?? []).flatMap((step) =>
          step.diffs.map((diff) => describeDiff(diff).dims),
        ),
      ),
    [journey],
  );
  const [selection, setSelection] = useState<VariantSelection | null>(null);
  const effectiveSelection = selection ?? getDefaultVariantSelection(dims);
  const rows = useMemo(
    () =>
      journey
        ? buildStoryboard(journey, describeDiff, effectiveSelection, {
            onlyChanges,
          })
        : [],
    [journey, effectiveSelection, onlyChanges],
  );

  if (build === undefined || (hasMore && !journey)) {
    return <PageLoader />;
  }

  const title = journey?.identity.title ?? params.flowKey;
  const changes = countChanges(rows);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectTitle params={params}>{title}</ProjectTitle>
      <div className="border-b-thin bg-app flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex min-w-0 flex-col">
          <Heading level={1} className="truncate text-base font-medium">
            {title}
          </Heading>
          {journey ? (
            <div className="text-low truncate text-xs">
              {journey.identity.prefix ? `${journey.identity.prefix} · ` : ""}
              {journey.steps.length} steps
              {changes > 0
                ? ` · ${changes} change${changes > 1 ? "s" : ""}`
                : ""}
            </div>
          ) : null}
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <VariantGroups
            dims={dims}
            selection={effectiveSelection}
            onChange={(change) =>
              setSelection({ ...effectiveSelection, ...change })
            }
          />
          <ChipButton
            icon={<EyeOffIcon />}
            aria-pressed={onlyChanges}
            color={onlyChanges ? "primary" : undefined}
            onClick={() => setOnlyChanges(!onlyChanges)}
          >
            Only changes
          </ChipButton>
          <BuildSelect
            builds={builds}
            value={buildNumber}
            onChange={onBuildChange}
          />
        </div>
      </div>
      {!build ? (
        <FlowEmptyState
          title={`Build #${buildNumber} does not exist`}
          params={params}
        >
          Pick another build to read this flow on.
        </FlowEmptyState>
      ) : !journey ? (
        <FlowEmptyState
          title={
            diffs.length === 0
              ? `Build #${build.number} has no screenshots yet`
              : `Not captured in build #${build.number}`
          }
          params={params}
        >
          {diffs.length === 0
            ? "The build is still running, or captured nothing. Pick another build to read this flow on."
            : "No test of this build walked this journey. Pick another build, or browse the flows of the latest build."}
        </FlowEmptyState>
      ) : (
        <Lane rows={rows} params={params} build={build} />
      )}
    </div>
  );
}

function FlowEmptyState(props: {
  title: string;
  children: React.ReactNode;
  params: FlowParams;
}) {
  return (
    <PageContainer>
      <EmptyState>
        <EmptyStateIcon>
          <WaypointsIcon />
        </EmptyStateIcon>
        <Heading>{props.title}</Heading>
        <Text slot="description">{props.children}</Text>
        <EmptyStateActions>
          <UILink href={getFlowsURL(props.params)}>All flows</UILink>
        </EmptyStateActions>
      </EmptyState>
    </PageContainer>
  );
}

function PageContent(props: { params: FlowParams }) {
  const { params } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: { project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });
  if (!project) {
    return <NotFound />;
  }
  const requested = Number(searchParams.get("build"));
  const buildNumber =
    Number.isInteger(requested) && requested > 0
      ? requested
      : (project.latestBuild?.number ?? null);
  if (buildNumber === null) {
    return (
      <FlowEmptyState title="No build yet" params={params}>
        Flows are read from the builds of the project. Run a build with
        screenshots and come back.
      </FlowEmptyState>
    );
  }
  return (
    <Storyboard
      key={buildNumber}
      params={params}
      buildNumber={buildNumber}
      builds={project.builds.edges}
      onBuildChange={(number) => setSearchParams({ build: String(number) })}
    />
  );
}

export function Component() {
  const params = useFlowParams();
  if (!params) {
    return <NotFound />;
  }
  return (
    <Page>
      <PageContent params={params} />
    </Page>
  );
}
