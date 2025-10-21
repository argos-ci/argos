import {
  createContext,
  memo,
  startTransition,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { interpolate } from "d3-interpolate";
import { pointer, select, Selection } from "d3-selection";
import { transition } from "d3-transition";
import { zoom, ZoomBehavior, zoomIdentity, ZoomTransform } from "d3-zoom";
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useObjectRef } from "react-aria";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildHotkey } from "./BuildHotkeys";
import { useScaleContext } from "./ScaleContext";

type ZoomPaneEvent = {
  state: Transform;
};

type ZoomPaneListener = {
  fn: (event: ZoomPaneEvent) => void;
  ignoreUpdate: boolean;
};

const MIN_ZOOM_SCALE = 0.1;
const MAX_ZOOM_SCALE = 96;

const isWrappedWithClass = (event: any, className: string | undefined) =>
  Boolean(event.target.closest(`.${className}`));

const ZOOMER_CONTROLS_CLASS = "zoomer-controls";

class Zoomer {
  zoom: ZoomBehavior<Element, unknown>;
  selection: Selection<Element, unknown, null, undefined>;
  listeners: ZoomPaneListener[];

  constructor(
    element: Element,
    scales: {
      minScale: number;
      maxScale: number;
    },
  ) {
    this.listeners = [];
    this.zoom = zoom()
      .scaleExtent([scales.minScale, scales.maxScale])
      .filter((event: any) => {
        if (isWrappedWithClass(event, ZOOMER_CONTROLS_CLASS)) {
          return false;
        }

        // default filter for d3-zoom
        return (!event.ctrlKey || event.type === "wheel") && !event.button;
      });

    this.zoom.on("zoom", (event) => {
      const state: Transform = {
        scale: event.transform.k,
        x: event.transform.x,
        y: event.transform.y,
      };

      this.listeners.forEach((listener) => {
        listener.fn({ state });
      });
    });
    this.selection = select(element);

    this.selection.call(this.zoom);

    this.selection.on(
      "wheel.zoom",
      (event: any) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const currentZoom = this.selection.property("__zoom").k || 1;

        if (event.ctrlKey || event.metaKey) {
          const point = pointer(event);
          // taken from https://github.com/d3/d3-zoom/blob/master/src/zoom.js
          const pinchDelta =
            -event.deltaY *
            (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.01) *
            2;
          const zoom = currentZoom * Math.pow(2, pinchDelta);
          this.zoom.scaleTo(this.selection, zoom, point);

          return;
        }

        // increase scroll speed in firefox
        // firefox: deltaMode === 1; chrome: deltaMode === 0
        const deltaNormalize = event.deltaMode === 1 ? 20 : 1;
        const deltaX = event.deltaX * deltaNormalize;
        const deltaY = event.deltaY * deltaNormalize;

        this.zoom.translateBy(
          this.selection,
          -(deltaX / currentZoom) * 0.5,
          -(deltaY / currentZoom) * 0.5,
        );
      },
      { passive: false },
    );
  }

  update(state: Transform): void {
    const listeners = this.listeners;
    this.listeners = this.listeners.filter((l) => !l.ignoreUpdate);

    this.zoom.transform(
      this.selection,
      zoomIdentity.translate(state.x, state.y).scale(state.scale),
    );

    this.listeners = listeners;
  }

  reset(): void {
    this.zoom.transform(this.selection, zoomIdentity);
  }

  zoomIn(): void {
    this.zoom.scaleBy(this.selection, 1.2);
  }

  zoomOut(): void {
    this.zoom.scaleBy(this.selection, 1 / 1.2);
  }

  getTransform(): Transform {
    const t = this.selection.property("__zoom");
    return {
      scale: t.k,
      x: t.x,
      y: t.y,
    };
  }

  subscribe(
    fn: ZoomPaneListener["fn"],
    options?: {
      ignoreUpdate?: boolean;
    },
  ): () => void {
    const desc: ZoomPaneListener = {
      fn,
      ignoreUpdate: Boolean(options?.ignoreUpdate),
    };
    this.listeners.push(desc);
    const unsubscribe = () => {
      this.listeners = this.listeners.filter((l) => l !== desc);
    };
    return unsubscribe;
  }
}

type ZoomerSyncCallback = (transform: Transform) => void;

type ZoomerSyncContextValue = {
  register: (instance: Zoomer) => () => void;
  subscribe: (callback: ZoomerSyncCallback) => () => void;
  getInitialTransform: () => Transform;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (
    rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
    options?: { maxScale?: number },
  ) => void;
};

const ZoomerSyncContext = createContext<ZoomerSyncContextValue | null>(null);

const initialTransform = { scale: 1, x: 0, y: 0 };

export function ZoomerSyncProvider(props: {
  children: React.ReactNode;
  id: string;
}) {
  const refInstances = useRef<Zoomer[]>([]);
  const subscribersRef = useRef<ZoomerSyncCallback[]>([]);
  const transformRef = useRef<Transform>(initialTransform);
  const subscribe = useCallback((callback: ZoomerSyncCallback) => {
    const handler = (transform: Transform) => {
      callback(transform);
    };
    subscribersRef.current.push(handler);
    return () => {
      subscribersRef.current = subscribersRef.current.filter(
        (f) => f !== handler,
      );
    };
  }, []);
  const register = useCallback((zoomer: Zoomer) => {
    refInstances.current.push(zoomer);
    const unsubscribe = zoomer.subscribe(
      (event) => {
        transformRef.current = event.state;
        refInstances.current.forEach((i) => {
          if (i !== zoomer) {
            i.update(event.state);
          }
        });
        subscribersRef.current.forEach((fn) => {
          fn(event.state);
        });
      },
      { ignoreUpdate: true },
    );
    return () => {
      unsubscribe();
      refInstances.current = refInstances.current.filter((i) => i !== zoomer);
    };
  }, []);
  const reset = useCallback(() => {
    refInstances.current.forEach((i) => i.reset());
    transformRef.current = initialTransform;
    subscribersRef.current.forEach((fn) => {
      fn(initialTransform);
    });
  }, []);
  useEffect(() => {
    return reset;
  }, [props.id, reset]);
  const getInitialTransform = useCallback(() => {
    return transformRef.current;
  }, []);
  const zoomIn = useCallback(() => {
    refInstances.current.forEach((i) => i.zoomIn());
  }, []);
  const zoomOut = useCallback(() => {
    refInstances.current.forEach((i) => i.zoomOut());
  }, []);

  /**
   * Zoom to a specific point and scale.
   * Scale by keeping the point in the same position.
   */
  const zoomTo: ZoomerSyncContextValue["zoomTo"] = useCallback(
    (rect, options) => {
      const maxScale = options?.maxScale;
      refInstances.current.forEach((i) => {
        const t = i.selection.transition(transition().duration(400));

        i.zoom.interpolate(interpolate).transform(t, function () {
          const k = Math.min(
            i.zoom.scaleExtent()[1],
            0.5 /
              Math.max(
                rect.width / this.clientWidth,
                rect.height / this.clientHeight,
              ),
            maxScale ?? i.zoom.scaleExtent()[1],
          );
          return translateTo(
            this,
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
            scaleTo(this, k),
          );
        });
      });
    },
    [],
  );
  const value = useMemo(
    (): ZoomerSyncContextValue => ({
      register,
      subscribe,
      getInitialTransform,
      reset,
      zoomIn,
      zoomOut,
      zoomTo,
    }),
    [register, subscribe, getInitialTransform, reset, zoomIn, zoomOut, zoomTo],
  );
  return <ZoomerSyncContext value={value}>{props.children}</ZoomerSyncContext>;
}

export function useZoomerSyncContext() {
  const ctx = use(ZoomerSyncContext);
  invariant(ctx, "Missing ZoomerSyncProvider");
  return ctx;
}

/**
 * Hook to get the current transform of the zoomer.
 */
export function useZoomTransform() {
  const { subscribe, getInitialTransform } = useZoomerSyncContext();
  const [transform, setTransform] = useState(getInitialTransform);
  useLayoutEffect(() => {
    return subscribe((t) => {
      startTransition(() => {
        setTransform(t);
      });
    });
  }, [subscribe]);
  return transform;
}

type Transform = {
  scale: number;
  x: number;
  y: number;
};

const checkIsTransformEqual = (a: Transform, b: Transform): boolean => {
  return a.scale === b.scale && a.x === b.x && a.y === b.y;
};

const transformToCss = (transform: Transform): string => {
  return `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
};

const identityTransform: Transform = {
  scale: 1,
  x: 0,
  y: 0,
};

const FitViewButton = memo(() => {
  const { reset } = useZoomerSyncContext();
  const hotkey = useBuildHotkey("fitView", reset, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      placement="left"
      description="Fit view"
      keys={hotkey.displayKeys}
    >
      <IconButton variant="contained" onPress={reset}>
        <MaximizeIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const ZoomInButton = memo((props: { disabled: boolean }) => {
  const { zoomIn } = useZoomerSyncContext();
  return (
    <Tooltip placement="left" content="Zoom in">
      <IconButton
        variant="contained"
        onPress={zoomIn}
        isDisabled={props.disabled}
      >
        <PlusIcon />
      </IconButton>
    </Tooltip>
  );
});

const ZoomOutButton = memo((props: { disabled: boolean }) => {
  const { zoomOut } = useZoomerSyncContext();
  return (
    <Tooltip placement="left" content="Zoom out">
      <IconButton
        variant="contained"
        onPress={zoomOut}
        isDisabled={props.disabled}
      >
        <MinusIcon />
      </IconButton>
    </Tooltip>
  );
});

export function ZoomPane(props: {
  children: React.ReactNode;
  dimensions: { width: number; height: number } | undefined;
  controls?: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const { dimensions, children, controls, ref } = props;
  const paneRef = useObjectRef(ref);
  const { register, getInitialTransform } = useZoomerSyncContext();
  const [imgScale] = useScaleContext();
  const [transform, setTransform] = useState<Transform>(identityTransform);
  const [scales, setScales] = useState<{ minScale: number; maxScale: number }>({
    minScale: MIN_ZOOM_SCALE,
    maxScale: MAX_ZOOM_SCALE,
  });

  useLayoutEffect(() => {
    const pane = paneRef.current;
    invariant(pane);

    // Compute the scales based on the dimensions of the image
    // to ensure that the scales are relative to the zoom on the image.
    const scales = (() => {
      const minScale = Math.min(MIN_ZOOM_SCALE, imgScale) / imgScale;
      const maxScale = MAX_ZOOM_SCALE / imgScale;
      return { minScale, maxScale };
    })();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScales(scales);
    const zoomer = new Zoomer(pane, scales);

    zoomer.subscribe((event) => {
      setTransform((previous) => {
        if (checkIsTransformEqual(previous, event.state)) {
          return previous;
        }
        return event.state;
      });
    });
    const initialTransform = getInitialTransform();
    zoomer.update(initialTransform);
    return register(zoomer);
  }, [register, getInitialTransform, dimensions, imgScale, paneRef]);

  return (
    <div
      ref={paneRef}
      className="group/pane bg-app flex min-h-0 flex-1 cursor-grab overflow-hidden rounded-sm border select-none"
    >
      <div
        className="flex min-h-0 min-w-0 flex-1 origin-top-left justify-center"
        style={{ transform: transformToCss(transform) }}
      >
        {children}
      </div>
      {controls && (
        <div className="opacity-0 transition group-focus-within/pane:opacity-100 group-hover/pane:opacity-100">
          <div
            className={clsx(
              ZOOMER_CONTROLS_CLASS,
              "absolute right-2 bottom-2 flex flex-col items-center gap-1",
            )}
          >
            {controls}
            <FitViewButton />
            <ZoomInButton disabled={transform.scale >= scales.maxScale} />
            <ZoomOutButton disabled={transform.scale <= scales.minScale} />
          </div>
        </div>
      )}
    </div>
  );
}

function getElementTransform(element: Element): ZoomTransform {
  invariant(
    "__zoom" in element &&
      element.__zoom &&
      element.__zoom instanceof ZoomTransform,
  );
  return element.__zoom;
}

function translateTo(
  element: Element,
  x: number,
  y: number,
  t0: ZoomTransform = getElementTransform(element),
) {
  const e = extent(element);
  const p0 = centroid(e);
  return zoomIdentity.translate(p0[0], p0[1]).scale(t0.k).translate(-x, -y);
}

function scaleTo(
  element: Element,
  k: number,
  t0: ZoomTransform = getElementTransform(element),
) {
  const e = extent(element);
  const p0 = centroid(e);
  const p1 = t0.invert(p0);
  return translate(scale(t0, k), p0, p1);
}

function scale(transform: ZoomTransform, k: number): ZoomTransform {
  k = Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, k));
  return k === transform.k
    ? transform
    : new ZoomTransform(k, transform.x, transform.y);
}

function translate(
  transform: ZoomTransform,
  p0: [number, number],
  p1: [number, number],
): ZoomTransform {
  const x = p0[0] - p1[0] * transform.k;
  const y = p0[1] - p1[1] * transform.k;
  return x === transform.x && y === transform.y
    ? transform
    : new ZoomTransform(transform.k, x, y);
}

function extent(e: Element): [[number, number], [number, number]] {
  return [
    [0, 0],
    [e.clientWidth, e.clientHeight],
  ];
}

function centroid(
  extent: [[number, number], [number, number]],
): [number, number] {
  return [
    (+extent[0][0] + +extent[1][0]) / 2,
    (+extent[0][1] + +extent[1][1]) / 2,
  ];
}
