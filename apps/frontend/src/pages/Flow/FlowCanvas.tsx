import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { clsx } from "clsx";

import { ImageKitPicture } from "@/ui/ImageKitPicture";

import "@xyflow/react/dist/style.css";

/**
 * Geometry of the canvas, in flow units. Everything is laid out by hand rather
 * than by a graph library: a journey is a straight line of screens grouped by
 * the test that took them, so there is no graph to solve.
 */
const SCREEN_WIDTH = 280;
const SCREEN_IMAGE_HEIGHT = 176;
const SCREEN_GAP = 48;
const SEGMENT_PADDING = 20;
const SEGMENT_GAP = 72;

/**
 * How far a label is allowed to grow as the canvas is zoomed out.
 *
 * Labels are counter-scaled so they keep their on-screen size, the way frame
 * names behave in a design tool — but without a ceiling, zooming far out turns
 * them into banners that cover the screens they name.
 */
const MAX_LABEL_SCALE = 2.5;

/** Height of a two-line screen label at zoom 1: its name over its path. */
const LABEL_HEIGHT = 38;

/**
 * Room kept above the images for their names.
 *
 * Derived rather than chosen: a label is drawn at up to {@link MAX_LABEL_SCALE}
 * when the canvas is zoomed out, and `fitView` opens well below zoom 1 — so a
 * space picked by eye at zoom 1 is overrun on arrival, and the first name of
 * each group climbs over the frame around it.
 */
const SCREEN_TITLE_SPACE = LABEL_HEIGHT * MAX_LABEL_SCALE;

export type CanvasScreen = {
  id: string;
  name: string;
  url: string;
  width: number | null;
  height: number | null;
  path: string | null;
};

export type CanvasSegment = {
  flowId: string;
  title: string;
  screens: CanvasScreen[];
};

/**
 * A label that keeps its size on screen whatever the zoom.
 *
 * The canvas scales everything under it, so the text is scaled back by the
 * inverse — which is what makes a name stay readable when the whole journey is
 * zoomed out to fit.
 */
function StableLabel(props: {
  children: React.ReactNode;
  className?: string;
  width: number;
}) {
  const { children, className, width } = props;
  const zoom = useStore((state) => state.transform[2]);
  const scale = Math.min(1 / zoom, MAX_LABEL_SCALE);
  return (
    // Anchored to the bottom of its slot and grown from there, so a label that
    // gets bigger as the canvas zooms out moves away from what it names instead
    // of covering it.
    <div
      className={clsx(
        "pointer-events-none absolute bottom-full left-0",
        className,
      )}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "bottom left",
        width: width / scale,
      }}
    >
      {children}
    </div>
  );
}

type ScreenNodeData = CanvasScreen & { index: number };

function ScreenNode(props: NodeProps<Node<ScreenNodeData>>) {
  const { data } = props;
  return (
    // The name goes above the image, deliberately: a screenshot of a long page
    // is very tall, and a caption underneath it ends up nowhere near the thing
    // it names.
    <div
      className="relative"
      style={{ width: SCREEN_WIDTH, height: SCREEN_IMAGE_HEIGHT }}
    >
      <StableLabel width={SCREEN_WIDTH} className="pb-2">
        <div className="truncate text-sm font-semibold">{data.name}</div>
        {data.path ? (
          <div className="text-low truncate text-xs">{data.path}</div>
        ) : null}
      </StableLabel>
      <div className="bg-app h-full overflow-hidden rounded-lg border shadow-md">
        <ImageKitPicture
          src={data.url}
          alt={data.name}
          className="block w-full"
          transformations={[`w-${SCREEN_WIDTH * 2}`]}
        />
      </div>
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

type SegmentNodeData = { title: string; screenCount: number };

function SegmentNode(props: NodeProps<Node<SegmentNodeData>>) {
  const { data } = props;
  // A violet wash rather than a dashed outline: zoomed out, a hairline all but
  // disappears, while a filled block still reads as one group — and the accent
  // ties the frame to the journey it belongs to.
  return (
    <div className="border-primary bg-primary-ui relative h-full w-full rounded-xl border">
      <StableLabel width={SCREEN_WIDTH * 2} className="pb-2.5">
        <div className="text-low truncate text-xs font-semibold">
          {data.title}
        </div>
      </StableLabel>
    </div>
  );
}

const nodeTypes = { screen: ScreenNode, segment: SegmentNode };

function buildGraph(segments: CanvasSegment[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let offsetX = 0;
  let previousScreenId: string | null = null;
  let index = 0;

  for (const segment of segments) {
    const count = segment.screens.length;
    const width =
      SEGMENT_PADDING * 2 + count * SCREEN_WIDTH + (count - 1) * SCREEN_GAP;
    const height =
      SEGMENT_PADDING * 2 + SCREEN_TITLE_SPACE + SCREEN_IMAGE_HEIGHT;
    const segmentId = `segment-${segment.flowId}`;

    nodes.push({
      id: segmentId,
      type: "segment",
      position: { x: offsetX, y: 0 },
      data: { title: segment.title, screenCount: count },
      style: { width, height },
      draggable: false,
      selectable: false,
      zIndex: 0,
    });

    segment.screens.forEach((screen, screenIndex) => {
      nodes.push({
        id: screen.id,
        type: "screen",
        parentId: segmentId,
        extent: "parent",
        position: {
          x: SEGMENT_PADDING + screenIndex * (SCREEN_WIDTH + SCREEN_GAP),
          y: SEGMENT_PADDING + SCREEN_TITLE_SPACE,
        },
        data: { ...screen, index: index++ },
        draggable: false,
        selectable: false,
      });

      if (previousScreenId) {
        edges.push({
          id: `${previousScreenId}->${screen.id}`,
          source: previousScreenId,
          target: screen.id,
          type: "smoothstep",
          animated: false,
        });
      }
      previousScreenId = screen.id;
    });

    offsetX += width + SEGMENT_GAP;
  }

  return { nodes, edges };
}

/**
 * The journey on a pannable canvas.
 *
 * Scrolling pans and pinching zooms, so a trackpad drives it the way it drives
 * a design tool; the wheel is deliberately not a zoom, which would make the
 * canvas jump every time someone scrolls the page under it.
 */
export function FlowCanvas(props: { segments: CanvasSegment[] }) {
  const { segments } = props;
  const { nodes, edges } = useMemo(() => buildGraph(segments), [segments]);

  return (
    <div className="border-subtle h-[560px] w-full overflow-hidden rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="system"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={3}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        panOnDrag
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
