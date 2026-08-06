import { useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ArrowLeftIcon, GripVerticalIcon } from "lucide-react";
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
  applyStoredOrder,
  useProjectFlows,
  useStoredOrders,
  type Flow,
  type FlowsBuild,
} from "./util";

function Storyboard(props: {
  flow: Flow;
  build: FlowsBuild;
  params: ProjectParams;
  storedOrder: string[] | undefined;
  onReorder: (names: string[]) => void;
}) {
  const { flow, build, params, storedOrder, onReorder } = props;
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

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-8 pt-6 pb-8"
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
          className="flex items-center gap-3"
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
          <div
            className={clsx(
              "group w-[26rem] max-w-[80vw] rounded-lg",
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
              <div className="group-hover:border-hover relative aspect-4/3 cursor-grab overflow-hidden rounded-lg border bg-white shadow-xs transition active:cursor-grabbing">
                <ImageKitPicture
                  src={step.screenshot.url}
                  transformations={["w-960", "h-960", "c-at_max"]}
                  className="size-full object-contain"
                  alt={step.label}
                />
                <GripVerticalIcon className="text-low absolute top-2 right-2 size-4 opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2 px-1">
                <span className="text-low text-sm tabular-nums">
                  {index + 1}
                </span>
                <span className="truncate font-medium">{step.label}</span>
                <span className="text-low ml-auto shrink-0 text-xs">
                  {step.screenshot.name}
                </span>
              </div>
            </Link>
          </div>
        </div>
      ))}
      {/* Dedicated end-of-flow drop target: the strip overflows on wide
          flows, so its own right edge is covered by cards. */}
      <div
        data-flow-dropend
        aria-hidden
        className={clsx(
          "h-40 w-12 shrink-0 rounded-lg",
          dragName !== null && "border border-dashed",
          overIndex === steps.length &&
            dragName !== null &&
            "ring-primary-active ring-2",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOverIndex(steps.length);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          drop(steps.length);
        }}
      />
    </div>
  );
}

function PageContent(props: { params: ProjectParams; flowId: string }) {
  const { params, flowId } = props;
  const { project, build, flows } = useProjectFlows(params);
  const { orders, setFlowOrder, resetFlowOrder } = useStoredOrders(params);

  if (!project) {
    return <NotFound />;
  }

  const flow = flows.find((candidate) => candidate.key === flowId) ?? null;

  if (!build || !flow) {
    return <NotFound />;
  }

  const storedOrder = orders[flow.key];

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
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {flow.prefix && (
            <span className="text-low font-mono text-sm">{flow.prefix} ›</span>
          )}
          <h1 className="text-xl font-semibold">{flow.title}</h1>
          <span className="text-low text-sm">
            {flow.steps.length} step{flow.steps.length > 1 ? "s" : ""} · drag to
            set their order
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
        storedOrder={storedOrder}
        onReorder={(names) => setFlowOrder(flow.key, names)}
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
