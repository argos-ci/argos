import { useCallback, useMemo, useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  ChevronRightIcon,
  GripVerticalIcon,
  WaypointsIcon,
} from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Link } from "react-router";

import { graphql, type DocumentType } from "@/gql";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import {
  EmptyState,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Time } from "@/ui/Time";

import { getBuildURL } from "../Build/BuildParams";
import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const ProjectFlowsQuery = graphql(`
  query ProjectFlows_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      latestAutoApprovedBuild {
        id
        number
        branch
        createdAt
        screenshotDiffs(after: 0, first: 100) {
          edges {
            id
            compareScreenshot {
              id
              name
              url
              width
              height
              contentType
              metadata {
                test {
                  title
                  titlePath
                }
              }
            }
          }
        }
      }
    }
  }
`);

type ProjectFlowsDocument = DocumentType<typeof ProjectFlowsQuery>;
type ReferenceBuild = NonNullable<
  NonNullable<ProjectFlowsDocument["project"]>["latestAutoApprovedBuild"]
>;
type DiffEdge = ReferenceBuild["screenshotDiffs"]["edges"][0];

type FlowStep = {
  edge: DiffEdge;
  screenshot: NonNullable<DiffEdge["compareScreenshot"]>;
};

type Flow = {
  /** Stable key: the joined test titlePath. */
  key: string;
  /** The test titlePath, e.g. ["checkout.spec.ts", "complete a purchase"]. */
  titlePath: string[];
  steps: FlowStep[];
};

/**
 * A flow is simply a test that took at least one screenshot: the test
 * titlePath (file › describe › test) is the flow identity — no metadata, no
 * configuration, it works for every existing project.
 */
function groupFlows(edges: DiffEdge[]): Flow[] {
  const byKey = new Map<string, Flow>();
  for (const edge of edges) {
    const screenshot = edge.compareScreenshot;
    const titlePath = screenshot?.metadata?.test?.titlePath;
    if (!screenshot || !titlePath || titlePath.length === 0) {
      continue;
    }
    const key = titlePath.join(" › ");
    const flow = byKey.get(key) ?? { key, titlePath, steps: [] };
    byKey.set(key, flow);
    flow.steps.push({ edge, screenshot });
  }
  return [...byKey.values()]
    .map((flow) => ({
      ...flow,
      // Default order is alphabetical — often wrong for a funnel, which is
      // exactly what manual ordering fixes.
      steps: flow.steps.toSorted((a, b) =>
        a.screenshot.name.localeCompare(b.screenshot.name),
      ),
    }))
    .toSorted((a, b) => a.key.localeCompare(b.key));
}

/**
 * Manual step ordering, persisted locally for the POC (screenshot names per
 * flow key). The production version would live server-side next to other
 * project-level curation (ignore config, automations).
 */
function useStoredOrders(params: ProjectParams) {
  const storageKey = `argos-flows-order:${params.accountSlug}/${params.projectName}`;
  const [orders, setOrders] = useState<Record<string, string[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {
      return {};
    }
  });
  const store = useCallback(
    (
      updater: (orders: Record<string, string[]>) => Record<string, string[]>,
    ) => {
      setOrders((previous) => {
        const next = updater(previous);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );
  const setFlowOrder = useCallback(
    (flowKey: string, names: string[]) => {
      store((orders) => ({ ...orders, [flowKey]: names }));
    },
    [store],
  );
  const resetFlowOrder = useCallback(
    (flowKey: string) => {
      store((orders) => {
        const { [flowKey]: _removed, ...rest } = orders;
        return rest;
      });
    },
    [store],
  );
  return { orders, setFlowOrder, resetFlowOrder };
}

/** Stored names first (when they still exist), new screenshots appended. */
function applyStoredOrder(steps: FlowStep[], stored: string[] | undefined) {
  if (!stored) {
    return steps;
  }
  const byName = new Map(steps.map((step) => [step.screenshot.name, step]));
  const ordered = stored.flatMap((name) => {
    const step = byName.get(name);
    if (!step) {
      return [];
    }
    byName.delete(name);
    return [step];
  });
  return [...ordered, ...byName.values()];
}

function stepLabel(screenshot: FlowStep["screenshot"]) {
  return screenshot.name.split("/").pop() || screenshot.name;
}

function FlowSection(props: {
  flow: Flow;
  build: ReferenceBuild;
  params: ProjectParams;
  storedOrder: string[] | undefined;
  onReorder: (names: string[]) => void;
  onReset: () => void;
}) {
  const { flow, build, params, storedOrder, onReorder, onReset } = props;
  const steps = useMemo(
    () => applyStoredOrder(flow.steps, storedOrder),
    [flow.steps, storedOrder],
  );
  const [dragName, setDragName] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const drop = (targetIndex: number) => {
    if (dragName === null) {
      return;
    }
    const names = steps.map((step) => step.screenshot.name);
    const fromIndex = names.indexOf(dragName);
    if (fromIndex !== -1 && fromIndex !== targetIndex) {
      names.splice(fromIndex, 1);
      names.splice(
        targetIndex > fromIndex ? targetIndex - 1 : targetIndex,
        0,
        dragName,
      );
      onReorder(names);
    }
    setDragName(null);
    setOverIndex(null);
  };

  const title = flow.titlePath.at(-1);
  const prefix = flow.titlePath.slice(0, -1).join(" › ");

  return (
    <section className="rounded-lg border">
      <div className="flex items-baseline gap-2 border-b p-4">
        {prefix && (
          <span className="text-low font-mono text-xs">{prefix} ›</span>
        )}
        <h2 className="text-base font-medium">{title}</h2>
        <span className="text-low text-sm">
          {flow.steps.length} step{flow.steps.length > 1 ? "s" : ""}
        </span>
        {storedOrder && (
          <div className="ml-auto flex items-baseline gap-2">
            <span className="text-low text-xs">Custom order</span>
            <Button variant="secondary" size="small" onPress={onReset}>
              Reset
            </Button>
          </div>
        )}
      </div>
      <div
        className="flex items-center gap-2 overflow-x-auto p-4"
        data-flow-strip={flow.key}
        onDragOver={(event) => {
          // Dragging past the last card drops at the end of the flow.
          event.preventDefault();
          setOverIndex(steps.length);
        }}
        onDrop={(event) => {
          event.preventDefault();
          drop(steps.length);
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step.edge.id}
            className="flex shrink-0 items-center gap-2"
            data-flow-step={step.screenshot.name}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", step.screenshot.name);
              event.dataTransfer.effectAllowed = "move";
              setDragName(step.screenshot.name);
            }}
            onDragEnd={() => {
              setDragName(null);
              setOverIndex(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              drop(index);
            }}
          >
            {index > 0 && (
              <ChevronRightIcon className="text-low size-4 shrink-0" />
            )}
            <div
              className={clsx(
                "group w-56 rounded-md",
                dragName === step.screenshot.name && "opacity-40",
                overIndex === index &&
                  dragName !== null &&
                  dragName !== step.screenshot.name &&
                  "ring-primary-active ring-2 ring-offset-2",
              )}
            >
              <Link
                to={getBuildURL({
                  accountSlug: params.accountSlug,
                  projectName: params.projectName,
                  buildNumber: build.number,
                  diffId: step.edge.id,
                })}
                draggable={false}
                className="block"
              >
                <div className="group-hover:border-hover relative aspect-4/3 cursor-grab overflow-hidden rounded-md border bg-white transition active:cursor-grabbing">
                  <ImageKitPicture
                    src={step.screenshot.url}
                    transformations={["w-448", "h-448", "c-at_max"]}
                    className="size-full object-contain"
                    alt={stepLabel(step.screenshot)}
                  />
                  <GripVerticalIcon className="text-low absolute top-1.5 right-1.5 size-4 opacity-0 transition group-hover:opacity-100" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5 px-0.5">
                  <span className="text-low text-xs tabular-nums">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {stepLabel(step.screenshot)}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const {
    data: { project },
  } = useSuspenseQuery(ProjectFlowsQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });

  const { orders, setFlowOrder, resetFlowOrder } = useStoredOrders(params);
  const build = project?.latestAutoApprovedBuild ?? null;
  const edges = useMemo(() => build?.screenshotDiffs.edges ?? [], [build]);
  const flows = useMemo(() => groupFlows(edges), [edges]);

  if (!project) {
    return <NotFound />;
  }

  if (!build || flows.length === 0) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIcon>
            <WaypointsIcon />
          </EmptyStateIcon>
          <Heading>No flows yet</Heading>
          <Text slot="description">
            A flow is a test that takes screenshots along a user journey —
            checkout, signup, onboarding. Flows appear automatically from your
            test structure as soon as a reference build has screenshots: nothing
            to configure.
          </Text>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Flows</Heading>
          <Text slot="headline">
            Your product's user journeys, derived from your test suite, as
            captured on the latest reference build. Drag steps to set their
            order.
          </Text>
        </PageHeaderContent>
        <Chip scale="sm" className="self-start">
          From build #{build.number} on {build.branch} ·{" "}
          <Time date={build.createdAt} />
        </Chip>
      </PageHeader>
      <div className="mb-8 flex flex-col gap-6">
        {flows.map((flow) => (
          <FlowSection
            key={flow.key}
            flow={flow}
            build={build}
            params={params}
            storedOrder={orders[flow.key]}
            onReorder={(names) => setFlowOrder(flow.key, names)}
            onReset={() => resetFlowOrder(flow.key)}
          />
        ))}
      </div>
    </PageContainer>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");

  return (
    <Page>
      <ProjectTitle params={params}>Flows</ProjectTitle>
      <PageContent params={params} />
    </Page>
  );
}
