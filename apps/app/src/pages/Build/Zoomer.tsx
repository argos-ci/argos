/* eslint-disable react/no-unescaped-entities */
import { Selection, select } from "d3-selection";
import { ZoomBehavior, zoom, zoomIdentity } from "d3-zoom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ZoomPaneEvent = {
  state: Transform;
  sourceEvent: MouseEvent | TouchEvent | null;
};
type ZoomPaneListener = (event: ZoomPaneEvent) => void;

type ZoomerOptions = {
  allowScroll?: boolean;
};

// Default filter from d3-zoom
const defaultFilter = (event: any) =>
  (!event.ctrlKey || event.type === "wheel") && !event.button;

const allowScrollFilter = (event: any) => {
  if (event.button) return false;

  if (event.type === "wheel") {
    // Only allow zooming with the wheel when the meta key or ctrl key is pressed
    return event.metaKey || event.ctrlKey;
  }

  return defaultFilter(event);
};

class Zoomer {
  zoom: ZoomBehavior<Element, unknown>;
  selection: Selection<Element, unknown, null, undefined>;
  listeners: ZoomPaneListener[];

  constructor(element: Element, options?: ZoomerOptions) {
    this.listeners = [];
    this.zoom = zoom()
      .scaleExtent([0.1, 15])
      .filter(options?.allowScroll ? allowScrollFilter : defaultFilter);

    this.zoom.on("zoom", (event) => {
      const state: Transform = {
        scale: event.transform.k,
        x: event.transform.x,
        y: event.transform.y,
      };

      this.listeners.forEach((listener) => {
        listener({
          state,
          sourceEvent: event.sourceEvent,
        });
      });
    });
    this.selection = select(element);
    this.selection
      .call(this.zoom)
      // Always prevent scrolling on wheel input regardless of the scale extent
      .on("scroll", (event) => {
        if (options?.allowScroll) {
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
          }
          return;
        }

        event.preventDefault();
      });
  }

  update(state: Transform): void {
    this.zoom.transform(
      this.selection,
      zoomIdentity.translate(state.x, state.y).scale(state.scale)
    );
  }

  reset(): void {
    this.zoom.transform(this.selection, zoomIdentity);
  }

  subscribe(listener: ZoomPaneListener): () => void {
    this.listeners.push(listener);
    const unsubscribe = () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
    return unsubscribe;
  }
}

type ZoomerSyncContextValue = {
  register: (instance: Zoomer) => () => void;
  getInitialTransform: () => Transform | null;
  reset: () => void;
};

const ZoomerSyncContext = createContext<ZoomerSyncContextValue | null>(null);

export const ZoomerSyncProvider = (props: {
  children: React.ReactNode;
  id: string;
}) => {
  const refInstances = useRef<Zoomer[]>([]);
  const transformRef = useRef<Transform | null>(null);
  const register = useCallback((zoomer: Zoomer) => {
    refInstances.current.push(zoomer);
    const unsubscribe = zoomer.subscribe((event) => {
      if (event.sourceEvent) {
        transformRef.current = event.state;
        refInstances.current.forEach((i) => {
          if (i !== zoomer) {
            i.update(event.state);
          }
        });
      }
    });
    return () => {
      unsubscribe();
      refInstances.current = refInstances.current.filter((i) => i !== zoomer);
    };
  }, []);
  useEffect(() => {
    return () => {
      refInstances.current.forEach((i) => i.reset());
    };
  }, [props.id]);
  const getInitialTransform = useCallback(() => {
    return transformRef.current;
  }, []);
  const reset = useCallback(() => {
    refInstances.current.forEach((i) => i.reset());
  }, []);
  const value = useMemo(
    () => ({ register, getInitialTransform, reset }),
    [register, getInitialTransform, reset]
  );
  return (
    <ZoomerSyncContext.Provider value={value}>
      {props.children}
    </ZoomerSyncContext.Provider>
  );
};

export const useZoomerSyncContext = () => {
  const ctx = useContext(ZoomerSyncContext);
  if (!ctx) {
    throw new Error("Missing ZoomerSyncProvider");
  }
  return ctx;
};

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

export const ZoomPane = (props: {
  children: React.ReactNode;
  controls?: React.ReactNode;
  allowScroll?: boolean;
}) => {
  const paneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { register, getInitialTransform } = useZoomerSyncContext();
  const [transform, setTransform] = useState<Transform>(identityTransform);
  useLayoutEffect(() => {
    const pane = paneRef.current as Element;
    const zoomer = new Zoomer(pane, { allowScroll: props.allowScroll });
    zoomer.subscribe((event) => {
      setTransform((previous) => {
        if (checkIsTransformEqual(previous, event.state)) {
          return previous;
        }
        return event.state;
      });
    });
    const initialTransform = getInitialTransform();
    if (initialTransform) {
      zoomer.update(initialTransform);
    }
    return register(zoomer);
  }, [register, getInitialTransform, props.allowScroll]);
  return (
    <div
      ref={paneRef}
      className="group/pane flex min-h-0 flex-1 cursor-grab overflow-hidden bg-zinc-800/50"
    >
      <div
        ref={contentRef}
        className="flex min-h-0 flex-1 origin-top-left justify-center"
        style={{ transform: transformToCss(transform) }}
      >
        <div className="relative">{props.children}</div>
      </div>
      {props.controls && (
        <div className="opacity-0 transition group-hover/pane:opacity-100">
          {props.controls}
        </div>
      )}
    </div>
  );
};
