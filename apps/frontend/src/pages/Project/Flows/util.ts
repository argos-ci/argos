import { useCallback, useMemo, useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";

import { graphql, type DocumentType } from "@/gql";
import {
  compareSteps,
  getCaptureIndex,
  getStepKey,
  getStepLabel,
  getVariantDims,
  getVariantLabel,
  resolveFlowIdentity,
  type FlowIdentity,
  type VariantDims,
} from "@/util/flow-model";

const _BuildFragment = graphql(`
  fragment ProjectFlows_Build on Build {
    id
    number
    branch
    createdAt
    type
    screenshotDiffs(after: 0, first: 1000) {
      pageInfo {
        hasNextPage
      }
      edges {
        id
        parentName
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
  dims: VariantDims;
};

/**
 * The values of a per-axis variant selection. `null` on an axis means "no
 * preference": `pickVariant` then keeps the step's first variant for it.
 */
export type VariantSelection = {
  browser: string | null;
  viewport: number | null;
  scheme: "dark" | "light" | null;
  mode: string | null;
};

/**
 * The variant axes a flow spans, one entry per axis that actually varies.
 * Scheme is resolved flow-wide: a name without a token is the light run as
 * soon as a dark sibling exists.
 */
export type FlowDimensions = {
  browsers: string[];
  viewports: number[];
  schemes: ("light" | "dark")[];
  modes: string[];
};

export function getFlowDimensions(flow: Flow): FlowDimensions {
  const variants = flow.steps.flatMap((step) => step.variants);
  const unique = <T>(values: (T | null)[]) => [
    ...new Set(values.filter((v): v is T => v !== null)),
  ];
  const hasDark = variants.some((v) => v.dims.scheme === "dark");
  return {
    browsers: unique(variants.map((v) => v.dims.browser)).toSorted(),
    viewports: unique(variants.map((v) => v.dims.viewport)).toSorted(
      (a, b) => a - b,
    ),
    schemes: hasDark ? ["light", "dark"] : [],
    modes: unique(variants.map((v) => v.dims.mode)).toSorted(),
  };
}

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

/**
 * Picks the variant best matching the per-axis selection: the one satisfying
 * the most selected axes wins, ties keep the stable label order. A step
 * missing the exact combination still shows its closest variant.
 */
export function pickVariant(
  step: FlowStep,
  selection: Partial<VariantSelection> | null,
): FlowStepVariant {
  const score = (variant: FlowStepVariant) => {
    if (!selection) {
      return 0;
    }
    const { dims } = variant;
    let matches = 0;
    if (selection.browser != null && dims.browser === selection.browser) {
      matches += 1;
    }
    if (selection.viewport != null && dims.viewport === selection.viewport) {
      matches += 1;
    }
    if (
      selection.scheme != null &&
      (dims.scheme ?? "light") === selection.scheme
    ) {
      matches += 1;
    }
    if (selection.mode != null && dims.mode === selection.mode) {
      matches += 1;
    }
    return matches;
  };
  const variant = step.variants.toSorted((a, b) => score(b) - score(a))[0];
  if (!variant) {
    throw new Error("a step always has at least one variant");
  }
  return variant;
}

function groupFlows(edges: DiffEdge[]): {
  flows: Flow[];
  ungroupedCount: number;
  singleStepCount: number;
} {
  type FlowAcc = FlowIdentity & { steps: Map<string, FlowStep> };
  const byKey = new Map<string, FlowAcc>();
  let ungroupedCount = 0;
  for (const edge of edges) {
    // ARIA snapshots and other child screenshots (`parentName`) are internal
    // companions of a snapshot, not steps of the journey.
    if (edge.parentName) {
      continue;
    }
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
      dims: getVariantDims(screenshot.name),
    });
    const captureIndex = getCaptureIndex(screenshot);
    if (captureIndex !== null) {
      step.captureIndex = Math.min(
        step.captureIndex ?? Number.MAX_SAFE_INTEGER,
        captureIndex,
      );
    }
  }
  const grouped = [...byKey.values()]
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
    .toSorted((a, b) => a.key.localeCompare(b.key));
  // A flow is a journey: a test that captures a single screen (whatever its
  // variants) is regular visual testing, not a flow.
  const flows = grouped.filter((flow) => flow.steps.length > 1);
  return {
    flows,
    ungroupedCount,
    singleStepCount: grouped.length - flows.length,
  };
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
  const { flows, ungroupedCount, singleStepCount } = useMemo(
    () => groupFlows(edges),
    [edges],
  );
  return {
    project,
    build,
    flows,
    ungroupedCount,
    singleStepCount,
    /** The build has more screenshots than the flows query fetched. */
    truncated: build?.screenshotDiffs.pageInfo.hasNextPage ?? false,
  };
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
