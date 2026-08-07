import { useCallback, useMemo, useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";

import { graphql, type DocumentType } from "@/gql";
import {
  compareSteps,
  getCaptureIndex,
  getStepKey,
  getStepLabel,
  getVariantLabel,
  resolveFlowIdentity,
  type FlowIdentity,
} from "@/util/flow-model";

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
            capture {
              index
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

export type FlowStepVariant = {
  edge: DiffEdge;
  screenshot: NonNullable<DiffEdge["compareScreenshot"]>;
  /** "1280px", "firefox · 414px"… or "default". */
  label: string;
};

export type FlowStep = {
  /** Variant-independent key (backend `variantKey` normalization). */
  key: string;
  label: string;
  captureIndex: number | null;
  variants: FlowStepVariant[];
};

export type Flow = FlowIdentity & {
  steps: FlowStep[];
  /** All variant labels present in the flow, for the variant switcher. */
  variantLabels: string[];
};

/** Picks the variant matching `selected`, falling back to the first one. */
export function pickVariant(
  step: FlowStep,
  selected: string | null,
): FlowStepVariant {
  const variant =
    (selected && step.variants.find((v) => v.label === selected)) ||
    step.variants[0];
  if (!variant) {
    throw new Error("a step always has at least one variant");
  }
  return variant;
}

function groupFlows(edges: DiffEdge[]): {
  flows: Flow[];
  ungroupedCount: number;
} {
  type FlowAcc = FlowIdentity & { steps: Map<string, FlowStep> };
  const byKey = new Map<string, FlowAcc>();
  let ungroupedCount = 0;
  for (const edge of edges) {
    const screenshot = edge.compareScreenshot;
    if (!screenshot) {
      continue;
    }
    const identity = resolveFlowIdentity(screenshot);
    if (!identity) {
      ungroupedCount += 1;
      continue;
    }
    const flow = byKey.get(identity.key) ?? { ...identity, steps: new Map() };
    byKey.set(identity.key, flow);
    const stepKey = getStepKey(screenshot.name);
    const step = flow.steps.get(stepKey) ?? {
      key: stepKey,
      label: getStepLabel(stepKey),
      captureIndex: null,
      variants: [],
    };
    flow.steps.set(stepKey, step);
    step.variants.push({
      edge,
      screenshot,
      label: getVariantLabel(screenshot.name),
    });
    const captureIndex = getCaptureIndex(screenshot);
    if (captureIndex !== null) {
      step.captureIndex = Math.min(
        step.captureIndex ?? Number.MAX_SAFE_INTEGER,
        captureIndex,
      );
    }
  }
  const flows = [...byKey.values()]
    .map(({ steps, ...identity }) => {
      const sortedSteps = [...steps.values()].map((step) => ({
        ...step,
        variants: step.variants.toSorted((a, b) =>
          a.label.localeCompare(b.label),
        ),
      }));
      return {
        ...identity,
        // Automatic order: capture index, then alphabetical. The manual
        // curation applies on top at render time (see `orderSteps`).
        steps: sortedSteps.toSorted((a, b) => compareSteps(a, b, undefined)),
        variantLabels: [
          ...new Set(
            sortedSteps.flatMap((step) =>
              step.variants.map((variant) => variant.label),
            ),
          ),
        ].toSorted((a, b) => a.localeCompare(b)),
      };
    })
    // Real journeys (several steps) first, single-screenshot tests after.
    .toSorted(
      (a, b) =>
        Number(b.steps.length > 1) - Number(a.steps.length > 1) ||
        a.key.localeCompare(b.key),
    );
  return { flows, ungroupedCount };
}

/** Curated order first (when stored), then capture index, then alphabetical. */
export function orderSteps(
  steps: FlowStep[],
  storedOrder: string[] | undefined,
) {
  return steps.toSorted((a, b) => compareSteps(a, b, storedOrder));
}

/**
 * Loads the flows of a project, preferring the reference build and falling
 * back to the latest build for projects that don't have one yet (e.g. only
 * PR builds).
 */
export function useProjectFlows(params: {
  accountSlug: string;
  projectName: string;
}) {
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
 * Manual step ordering, persisted locally for the POC (step keys per flow
 * key). The production version would live server-side next to other
 * project-level curation (ignore config, automations).
 */
export function useStoredOrders(params: {
  accountSlug: string;
  projectName: string;
}) {
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
    (flowKey: string, stepKeys: string[]) => {
      store((orders) => ({ ...orders, [flowKey]: stepKeys }));
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

export function getFlowURL(
  params: { accountSlug: string; projectName: string },
  flowKey: string,
) {
  return `/${params.accountSlug}/${params.projectName}/flows/${encodeURIComponent(flowKey)}`;
}
