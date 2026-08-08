import { useEffect, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  PencilIcon,
} from "lucide-react";
import { Heading } from "react-aria-components";
import { Link, useParams } from "react-router";

import { Button } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { ChipButton } from "@/ui/Chip";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";

import { getBuildURL } from "../../Build/BuildParams";
import { BrowserIcon } from "../../Build/metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../../Build/metadata/browser/browserLabels";
import {
  colorSchemeIcons,
  getViewportIconKind,
  viewportIcons,
} from "../../Build/metadata/metadataIcons";
import { NotFound } from "../../NotFound";
import { useProjectParams, type ProjectParams } from "../ProjectParams";
import { ProjectTitle } from "../ProjectTitle";
import {
  getFlowDimensions,
  orderSteps,
  pickVariant,
  useProjectFlows,
  useStoredNames,
  useStoredOrders,
  type Flow,
  type FlowDimensions,
  type FlowsBuild,
  type VariantSelection,
} from "./util";

/**
 * One button group per variant axis (browser, viewport, color scheme, mode),
 * mirroring the chips of the build review sidebar.
 */
function VariantGroups(props: {
  dimensions: FlowDimensions;
  selection: VariantSelection;
  onChange: (selection: Partial<VariantSelection>) => void;
}) {
  const { dimensions, selection, onChange } = props;
  return (
    <>
      {dimensions.browsers.length > 1 && (
        <ButtonGroup>
          {dimensions.browsers.map((browser) => (
            <Tooltip key={browser} content={getBrowserLabel(browser)}>
              <ChipButton
                icon={<BrowserIcon browser={{ name: browser }} />}
                className="cursor-default"
                aria-current={
                  selection.browser === browser ? "page" : undefined
                }
                onPress={() => onChange({ browser })}
              >
                {getBrowserLabel(browser)}
              </ChipButton>
            </Tooltip>
          ))}
        </ButtonGroup>
      )}
      {dimensions.viewports.length > 1 && (
        <ButtonGroup>
          {dimensions.viewports.map((viewport) => (
            <Tooltip key={viewport} content={`Viewport width of ${viewport}px`}>
              <ChipButton
                icon={viewportIcons[getViewportIconKind(viewport)]}
                className="cursor-default"
                aria-current={
                  selection.viewport === viewport ? "page" : undefined
                }
                onPress={() => onChange({ viewport })}
              >
                {viewport}
              </ChipButton>
            </Tooltip>
          ))}
        </ButtonGroup>
      )}
      {dimensions.modes.length > 1 && (
        <ButtonGroup>
          {dimensions.modes.map((mode) => (
            <ChipButton
              key={mode}
              className="cursor-default"
              aria-current={selection.mode === mode ? "page" : undefined}
              onPress={() => onChange({ mode })}
            >
              {mode}
            </ChipButton>
          ))}
        </ButtonGroup>
      )}
      {dimensions.schemes.length > 1 && (
        <ButtonGroup>
          {dimensions.schemes.map((scheme) => (
            <Tooltip key={scheme} content={`${scheme} color scheme`}>
              <ChipButton
                icon={colorSchemeIcons[scheme]}
                className="cursor-default"
                aria-current={selection.scheme === scheme ? "page" : undefined}
                onPress={() => onChange({ scheme })}
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

function Storyboard(props: {
  flow: Flow;
  build: FlowsBuild;
  params: ProjectParams;
  selection: VariantSelection;
  storedOrder: string[] | undefined;
  onReorder: (stepKeys: string[]) => void;
}) {
  const { flow, build, params, selection, storedOrder, onReorder } = props;
  const steps = useMemo(
    () => orderSteps(flow.steps, storedOrder),
    [flow.steps, storedOrder],
  );

  const move = (index: number, delta: -1 | 1) => {
    const keys = steps.map((step) => step.key);
    const target = index + delta;
    if (target < 0 || target >= keys.length) {
      return;
    }
    const [moved] = keys.splice(index, 1);
    keys.splice(target, 0, moved as string);
    onReorder(keys);
  };

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeStepKey = activeKey ?? steps[0]?.key ?? null;

  // Scrollspy: the step crossing the upper band of the viewport drives the
  // highlighted thumbnail in the minimap.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute("data-flow-step-section");
            if (key) {
              setActiveKey(key);
            }
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    const elements = document.querySelectorAll("[data-flow-step-section]");
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [steps]);

  const scrollToStep = (key: string) => {
    setActiveKey(key);
    document
      .querySelector(`[data-flow-step-section="${CSS.escape(key)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col pt-3 pb-16">
      {/* Minimap of the journey, sticky while browsing the steps below:
          every step stays in sight, a click scrolls to it. */}
      <div className="bg-app sticky top-0 z-10 flex items-center gap-1 overflow-x-auto py-2">
        {steps.map((step, index) => {
          const isActive = step.key === activeStepKey;
          const variant = pickVariant(step, selection);
          return (
            <div key={step.key} className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <ChevronRightIcon className="text-low size-3.5 shrink-0" />
              )}
              <button
                type="button"
                data-flow-step={step.key}
                onClick={() => scrollToStep(step.key)}
                className="flex flex-col items-center gap-1 rounded-md p-1"
              >
                <span
                  className={clsx(
                    "block h-20 overflow-hidden rounded-md border bg-white transition",
                    isActive
                      ? "ring-primary-active ring-2"
                      : "hover:border-hover",
                  )}
                >
                  <ImageKitPicture
                    src={variant.screenshot.url}
                    transformations={["w-320", "h-320", "c-at_max"]}
                    className="block h-full w-auto max-w-36 object-contain"
                    alt={step.label}
                  />
                </span>
                <span
                  className={clsx(
                    "max-w-32 truncate text-[0.6875rem] leading-none",
                    isActive ? "font-medium" : "text-low",
                  )}
                >
                  {index + 1} · {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Every step, large, in journey order. */}
      <div className="flex max-w-4xl flex-col gap-10 pt-6">
        {steps.map((step, index) => {
          const variant = pickVariant(step, selection);
          return (
            <div
              key={step.key}
              data-flow-step-section={step.key}
              className="group scroll-mt-36"
            >
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-low text-sm tabular-nums">
                  {index + 1}
                </span>
                <span className="font-medium">{step.label}</span>
                <span className="text-low truncate text-xs">
                  {variant.screenshot.name}
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="small"
                    iconOnly
                    aria-label="Move up"
                    isDisabled={index === 0}
                    onPress={() => move(index, -1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    iconOnly
                    aria-label="Move down"
                    isDisabled={index === steps.length - 1}
                    onPress={() => move(index, 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                </div>
              </div>
              <Link
                to={getBuildURL({
                  accountSlug: params.accountSlug,
                  projectName: params.projectName,
                  buildNumber: build.number,
                  diffId: variant.edge.id,
                })}
                className="hover:border-hover block w-fit max-w-full overflow-hidden rounded-lg border bg-white shadow-xs transition"
              >
                <ImageKitPicture
                  key={variant.edge.id}
                  src={variant.screenshot.url}
                  transformations={["w-1400", "h-1400", "c-at_max"]}
                  className="block max-h-160 w-auto max-w-full"
                  alt={step.label}
                />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageContent(props: { params: ProjectParams; flowId: string }) {
  const { params, flowId } = props;
  const { project, build, flows, truncated } = useProjectFlows(params);
  const { orders, setFlowOrder, resetFlowOrder } = useStoredOrders(params);
  const { names, setFlowName } = useStoredNames(params);
  const [partialSelection, setPartialSelection] = useState<
    Partial<VariantSelection>
  >({});
  const [editingName, setEditingName] = useState(false);

  if (!project) {
    return <NotFound />;
  }

  const flow = flows.find((candidate) => candidate.key === flowId) ?? null;

  if (!build || !flow) {
    return <NotFound />;
  }

  const storedOrder = orders[flow.key];
  const dimensions = getFlowDimensions(flow);
  // Defaults per axis: first browser, largest viewport (desktop), light.
  const selection: VariantSelection = {
    browser: partialSelection.browser ?? dimensions.browsers[0] ?? null,
    viewport: partialSelection.viewport ?? dimensions.viewports.at(-1) ?? null,
    scheme: partialSelection.scheme ?? dimensions.schemes[0] ?? null,
    mode: partialSelection.mode ?? dimensions.modes[0] ?? null,
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <div className="flex items-center gap-1">
            {editingName ? (
              <input
                autoFocus
                defaultValue={names[flow.key] ?? flow.title}
                aria-label="Flow name"
                className="rounded-sm border px-2 py-0.5 text-lg font-semibold outline-hidden"
                onBlur={(event) => {
                  const value = event.currentTarget.value.trim();
                  setFlowName(
                    flow.key,
                    value && value !== flow.title ? value : null,
                  );
                  setEditingName(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    setEditingName(false);
                  }
                }}
              />
            ) : (
              <>
                <Heading className="text-lg!">
                  {names[flow.key] ?? flow.title}
                </Heading>
                <Tooltip content="Rename flow">
                  <Button
                    variant="ghost"
                    iconOnly
                    size="small"
                    aria-label="Rename flow"
                    onPress={() => setEditingName(true)}
                  >
                    <PencilIcon />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
          <div className="text-low flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm">
            {flow.prefix ? (
              <>
                <span className="truncate font-mono text-xs">
                  {flow.prefix}
                  {names[flow.key] ? ` › ${flow.title}` : ""}
                </span>
                <span>·</span>
              </>
            ) : null}
            <span className="shrink-0">
              {flow.steps.length} step{flow.steps.length > 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span className="shrink-0">
              from build #{build.number} on {build.branch} ·{" "}
              <Time date={build.createdAt} />
            </span>
          </div>
        </PageHeaderContent>
        <PageHeaderActions>
          {storedOrder && (
            <>
              <span className="text-low text-xs">Custom order</span>
              <Button
                variant="secondary"
                size="small"
                onPress={() => resetFlowOrder(flow.key)}
              >
                Reset
              </Button>
            </>
          )}
          <VariantGroups
            dimensions={dimensions}
            selection={selection}
            onChange={(change) =>
              setPartialSelection((previous) => ({ ...previous, ...change }))
            }
          />
        </PageHeaderActions>
      </PageHeader>
      {truncated ? (
        <div className="text-low text-xs">
          Flows are computed from the first 1000 screenshots of the build — some
          steps or variants may be missing.
        </div>
      ) : null}
      <Storyboard
        flow={flow}
        build={build}
        params={params}
        selection={selection}
        storedOrder={storedOrder}
        onReorder={(stepKeys) => setFlowOrder(flow.key, stepKeys)}
      />
    </PageContainer>
  );
}

export function Component() {
  const params = useProjectParams();
  const { flowId } = useParams();
  invariant(params && flowId, "it is a project flow route");

  return (
    <Page>
      <ProjectTitle params={params}>{flowId}</ProjectTitle>
      <PageContent params={params} flowId={flowId} />
    </Page>
  );
}
