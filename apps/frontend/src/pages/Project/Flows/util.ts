import { useCallback, useMemo, useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";

import { graphql, type DocumentType } from "@/gql";

import type { ProjectParams } from "../ProjectParams";

const _BuildFragment = graphql(`
  fragment ProjectFlows_Build on Build {
    id
    number
    branch
    createdAt
    type
    screenshotDiffs(after: 0, first: 300) {
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
            story {
              id
            }
          }
        }
      }
    }
  }
`);

const ProjectFlowsQuery = graphql(`
  query ProjectFlows_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      latestAutoApprovedBuild {
        id
        ...ProjectFlows_Build
      }
      latestBuild {
        id
        ...ProjectFlows_Build
      }
    }
  }
`);

export type FlowsBuild = DocumentType<typeof _BuildFragment>;
type DiffEdge = FlowsBuild["screenshotDiffs"]["edges"][0];

export type FlowStep = {
  edge: DiffEdge;
  screenshot: NonNullable<DiffEdge["compareScreenshot"]>;
  label: string;
};

export type Flow = {
  /** Stable key, e.g. the joined test titlePath or a story component id. */
  key: string;
  /** Muted context shown before the title (test file, "storybook"…). */
  prefix: string;
  title: string;
  steps: FlowStep[];
};

/**
 * A flow is any test that took at least one screenshot: the test titlePath
 * (file › describe › test) is the flow identity — no metadata to add, no
 * configuration. Storybook uploads carry a story id instead: stories group
 * by component, one step per story.
 */
function resolveFlowOf(
  screenshot: NonNullable<DiffEdge["compareScreenshot"]>,
): { key: string; prefix: string; title: string; stepLabel: string } | null {
  const titlePath = screenshot.metadata?.test?.titlePath;
  if (titlePath && titlePath.length > 0) {
    return {
      key: titlePath.join(" › "),
      prefix: titlePath.slice(0, -1).join(" › "),
      title: titlePath.at(-1) as string,
      stepLabel: screenshot.name.split("/").pop() || screenshot.name,
    };
  }
  const storyId = screenshot.metadata?.story?.id;
  if (storyId) {
    const [component, ...variant] = storyId.split("--");
    return {
      key: `storybook › ${component}`,
      prefix: "storybook",
      title: component as string,
      stepLabel: variant.join("--") || screenshot.name,
    };
  }
  return null;
}

function groupFlows(edges: DiffEdge[]): {
  flows: Flow[];
  ungroupedCount: number;
} {
  const byKey = new Map<string, Flow>();
  let ungroupedCount = 0;
  for (const edge of edges) {
    const screenshot = edge.compareScreenshot;
    if (!screenshot) {
      continue;
    }
    const resolved = resolveFlowOf(screenshot);
    if (!resolved) {
      ungroupedCount += 1;
      continue;
    }
    const flow = byKey.get(resolved.key) ?? {
      key: resolved.key,
      prefix: resolved.prefix,
      title: resolved.title,
      steps: [],
    };
    byKey.set(resolved.key, flow);
    flow.steps.push({ edge, screenshot, label: resolved.stepLabel });
  }
  const flows = [...byKey.values()]
    .map((flow) => ({
      ...flow,
      // Default order is alphabetical — often wrong for a funnel, which is
      // exactly what manual ordering fixes.
      steps: flow.steps.toSorted((a, b) =>
        a.screenshot.name.localeCompare(b.screenshot.name),
      ),
    }))
    // Real journeys (several steps) first, single-screenshot tests after.
    .toSorted(
      (a, b) =>
        Number(b.steps.length > 1) - Number(a.steps.length > 1) ||
        a.key.localeCompare(b.key),
    );
  return { flows, ungroupedCount };
}

/**
 * Loads the flows of a project, preferring the reference build and falling
 * back to the latest build for projects that don't have one yet (e.g. only
 * PR builds).
 */
export function useProjectFlows(params: ProjectParams) {
  const {
    data: { project },
  } = useSuspenseQuery(ProjectFlowsQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });
  const build =
    project?.latestAutoApprovedBuild ?? project?.latestBuild ?? null;
  const edges = useMemo(() => build?.screenshotDiffs.edges ?? [], [build]);
  const { flows, ungroupedCount } = useMemo(() => groupFlows(edges), [edges]);
  return { project, build, flows, ungroupedCount };
}

/**
 * Manual step ordering, persisted locally for the POC (screenshot names per
 * flow key). The production version would live server-side next to other
 * project-level curation (ignore config, automations).
 */
export function useStoredOrders(params: ProjectParams) {
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
export function applyStoredOrder(
  steps: FlowStep[],
  stored: string[] | undefined,
) {
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

export function getFlowURL(params: ProjectParams, flowKey: string) {
  return `/${params.accountSlug}/${params.projectName}/flows/${encodeURIComponent(flowKey)}`;
}
