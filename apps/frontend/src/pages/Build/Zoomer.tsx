import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { pointer, select, Selection } from "d3-selection";
import { zoom, ZoomBehavior, zoomIdentity } from "d3-zoom";
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildHotkey } from "./BuildHotkeys";

type ZoomPaneEvent = {
  state: Transform;
};

type ZoomPaneListener = {
  fn: (event: ZoomPaneEvent) => void;
  ignoreUpdate: boolean;
};

const MIN_ZOOM_SCALE = 0.1;
const MAX_ZOOM_SCALE = 34;

const isWrappedWithClass = (event: any, className: string | undefined) =>
  Boolean(event.target.closest(`.${className}`));

const ZOOMER_CONTROLS_CLASS = "zoomer-controls";

class Zoomer {
  zoom: ZoomBehavior<Element, unknown>;
  selection: Selection<Element, unknown, null, undefined>;
  listeners: ZoomPaneListener[];

  constructor(element: Element) {
    this.listeners = [];
    this.zoom = zoom()
      .scaleExtent([MIN_ZOOM_SCALE, MAX_ZOOM_SCALE])
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
};

const ZoomerSyncContext = createContext<ZoomerSyncContextValue | null>(null);

const initialTransform = { scale: 1, x: 0, y: 0 };

export const ZoomerSyncProvider = (props: {
  children: React.ReactNode;
  id: string;
}) => {
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
  const value = useMemo(
    () => ({
      register,
      subscribe,
      getInitialTransform,
      reset,
      zoomIn,
      zoomOut,
    }),
    [register, subscribe, getInitialTransform, reset, zoomIn, zoomOut],
  );
  return (
    <ZoomerSyncContext.Provider value={value}>
      {props.children}
    </ZoomerSyncContext.Provider>
  );
};

export const useZoomerSyncContext = () => {
  const ctx = useContext(ZoomerSyncContext);
  invariant(ctx, "Missing ZoomerSyncProvider");
  return ctx;
};

/**
 * Hook to get the current transform of the zoomer.
 */
export function useZoomTransform() {
  const { subscribe, getInitialTransform } = useZoomerSyncContext();
  const [transform, setTransform] = useState(getInitialTransform);
  useLayoutEffect(() => {
    return subscribe((t) => {
      setTransform(t);
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
  controls?: React.ReactNode;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { register, getInitialTransform } = useZoomerSyncContext();
  const [transform, setTransform] = useState<Transform>(identityTransform);
  useLayoutEffect(() => {
    const pane = paneRef.current as Element;
    const zoomer = new Zoomer(pane);
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
  }, [register, getInitialTransform]);
  return (
    <div
      ref={paneRef}
      className="group/pane bg-app flex min-h-0 flex-1 cursor-grab select-none overflow-hidden rounded border"
    >
      <div
        ref={contentRef}
        className="flex min-h-0 min-w-0 flex-1 origin-top-left justify-center"
        style={{ transform: transformToCss(transform) }}
      >
        {props.children}
      </div>
      {props.controls && (
        <div className="opacity-0 transition group-focus-within/pane:opacity-100 group-hover/pane:opacity-100">
          <div
            className={clsx(
              ZOOMER_CONTROLS_CLASS,
              "absolute bottom-2 right-2 flex flex-col items-center gap-1",
            )}
          >
            {props.controls}
            <FitViewButton />
            <ZoomInButton disabled={transform.scale >= MAX_ZOOM_SCALE} />
            <ZoomOutButton disabled={transform.scale <= MIN_ZOOM_SCALE} />
          </div>
        </div>
      )}
    </div>
  );
}
