import { useEffect, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import { Page, PageContainer } from "@/ui/Layout";
import { Time } from "@/ui/Time";

import { getBuildURL } from "../../Build/BuildParams";
import { NotFound } from "../../NotFound";
import {
  getProjectURL,
  useProjectParams,
  type ProjectParams,
} from "../ProjectParams";
import { ProjectTitle } from "../ProjectTitle";
import {
  orderSteps,
  pickVariant,
  useProjectFlows,
  useStoredOrders,
  type Flow,
  type FlowsBuild,
} from "./util";

function VariantSwitcher(props: {
  labels: string[];
  selected: string;
  onSelect: (label: string) => void;
}) {
  const { labels, selected, onSelect } = props;
  if (labels.length < 2) {
    return null;
  }
  return (
    <div
      className="flex items-center gap-0.5 rounded-md border p-0.5"
      role="radiogroup"
      aria-label="Variant"
    >
      {labels.map((label) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={label === selected}
          onClick={() => onSelect(label)}
          className={clsx(
            "rounded px-2 py-0.5 text-xs transition",
            label === selected
              ? "bg-active text-default font-medium"
              : "text-low hover:text-default",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Storyboard(props: {
  flow: Flow;
  build: FlowsBuild;
  params: ProjectParams;
  selectedVariant: string;
  storedOrder: string[] | undefined;
  onReorder: (stepKeys: string[]) => void;
}) {
  const { flow, build, params, selectedVariant, storedOrder, onReorder } =
    props;
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
          const variant = pickVariant(step, selectedVariant);
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
          const variant = pickVariant(step, selectedVariant);
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
  const { project, build, flows } = useProjectFlows(params);
  const { orders, setFlowOrder, resetFlowOrder } = useStoredOrders(params);
  const [variant, setVariant] = useState<string | null>(null);

  if (!project) {
    return <NotFound />;
  }

  const flow = flows.find((candidate) => candidate.key === flowId) ?? null;

  if (!build || !flow) {
    return <NotFound />;
  }

  const storedOrder = orders[flow.key];
  const selectedVariant = variant ?? flow.variantLabels[0] ?? "default";

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 pt-6">
        <Link
          to={`${getProjectURL(params)}/flows`}
          className="text-low hover:text-default flex items-center gap-1.5 text-sm transition"
        >
          <ArrowLeftIcon className="size-3.5" />
          Flows
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {flow.prefix && (
            <span className="text-low font-mono text-sm">{flow.prefix} ›</span>
          )}
          <h1 className="text-xl font-semibold">{flow.title}</h1>
          <span className="text-low text-sm">
            {flow.steps.length} step{flow.steps.length > 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex items-center gap-3">
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
            <VariantSwitcher
              labels={flow.variantLabels}
              selected={selectedVariant}
              onSelect={setVariant}
            />
            <Chip scale="sm">
              From build #{build.number} on {build.branch} ·{" "}
              <Time date={build.createdAt} />
            </Chip>
          </div>
        </div>
      </div>
      <Storyboard
        flow={flow}
        build={build}
        params={params}
        selectedVariant={selectedVariant}
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
