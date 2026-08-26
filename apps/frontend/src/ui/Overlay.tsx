import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  use,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { invariant } from "@argos/util/invariant";

import { HotkeyTooltip } from "./HotkeyTooltip";
import { Tooltip } from "./Tooltip";
import { useEventCallback } from "./useEventCallback";

/**
 * Renders the trigger with the overlay's own trigger part wrapped around the
 * right element — `wrap` receives the pressable, and what comes back is the
 * whole control.
 */
type OverlayTriggerRenderer = (
  wrap: (element: ReactElement) => ReactNode,
) => ReactNode;

/**
 * A tooltip around a trigger stays *outside* the overlay's trigger part: the
 * tooltip consumes the props handed to it rather than forwarding them, so
 * wrapping the tooltip itself would leave the overlay deaf to the press. The
 * pressable inside is what gets wrapped, and the tooltip is put back around
 * the result — the same `Tooltip > Trigger > Button` order the menus use.
 */
function getTriggerRenderer(element: ReactElement): OverlayTriggerRenderer {
  if (element.type === Tooltip || element.type === HotkeyTooltip) {
    const child = (element.props as { children?: ReactNode }).children;
    if (isValidElement(child)) {
      return (wrap) => cloneElement(element, undefined, wrap(child));
    }
  }
  return (wrap) => wrap(element);
}

/**
 * The open state of an overlay — a dialog, a popover, the emoji picker.
 *
 * `isOpen`/`setOpen` are what the overlay drives Base UI's root with; `close`
 * is the only member anything outside `ui/` ever touches. It carried
 * react-stately's full shape at first — `open()`, `toggle()` — which nothing
 * ever called: that was react-aria's contract, and react-aria is gone.
 */
type OverlayState = {
  isOpen: boolean;
  close: () => void;
  setOpen: (open: boolean) => void;
};

type OverlayTriggerContextValue = {
  state: OverlayState;
  /**
   * How the overlay renders the control that opens it. Held rather than
   * rendered: the overlay wraps it in its own Base UI trigger part, which is
   * what wires the aria attributes, the toggle-on-press behaviour and — for
   * popovers — the anchor the popup positions against. `DialogTrigger` cannot
   * render the trigger part itself, because it does not know which namespace
   * its overlay child belongs to.
   */
  renderTrigger: OverlayTriggerRenderer | null;
};

const OverlayTriggerContext = createContext<OverlayTriggerContextValue | null>(
  null,
);

/** One overlay open state, controlled from props or owned locally. */
function useLocalOverlayState(props: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}): OverlayState {
  const { open: openProp, defaultOpen = false, onOpenChange } = props;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const isOpen = openProp ?? uncontrolled;
  const setOpen = useEventCallback((next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  });
  return useMemo<OverlayState>(
    () => ({ isOpen, setOpen, close: () => setOpen(false) }),
    [isOpen, setOpen],
  );
}

/**
 * Ties a trigger element to the overlay that follows it.
 *
 * ```tsx
 * <DialogTrigger>
 *   <Button>Delete</Button>
 *   <Modal>
 *     <Dialog role="alertdialog">…</Dialog>
 *   </Modal>
 * </DialogTrigger>
 * ```
 *
 * The first element child is the trigger; the overlay renders it through its
 * own Base UI trigger part, in the same spot in the tree. The name is a
 * react-aria survival: it also triggers popovers and the emoji picker.
 */
export function DialogTrigger(props: {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { children, ...stateProps } = props;
  const state = useLocalOverlayState(stateProps);
  const [triggerElement, ...overlays] =
    Children.toArray(children).filter(isValidElement);
  invariant(
    triggerElement,
    "DialogTrigger expects a trigger element as its first child",
  );
  // react-aria accepted a `DialogTrigger` wrapping nothing but an overlay;
  // here that renders an empty tree and the control silently does nothing.
  // Counted on the child slots rather than on `overlays`, which has already
  // dropped the falsy ones: `{canDelete && <Modal />}` is an overlay the author
  // wrote and this render happens not to want, not a missing one.
  invariant(
    Children.count(children) > 1,
    "DialogTrigger expects an overlay after its trigger",
  );
  const value = useMemo<OverlayTriggerContextValue>(
    () => ({ state, renderTrigger: getTriggerRenderer(triggerElement) }),
    [state, triggerElement],
  );
  return (
    <OverlayTriggerContext value={value}>{overlays}</OverlayTriggerContext>
  );
}

/**
 * Closes the overlay this component is rendered in, from any depth.
 *
 * Base UI has no equivalent: its dialog namespace exports parts and a
 * module-scoped handle, and `Dialog.Close` is a button — none of which a
 * mutation's `onCompleted` deep inside the dialog can call. That gap is why
 * this file exists.
 */
export function useOverlayTriggerState(): Pick<OverlayState, "close"> {
  const ctx = use(OverlayTriggerContext);
  invariant(
    ctx,
    "useOverlayTriggerState must be used within an overlay trigger",
  );
  return ctx.state;
}

/**
 * How an overlay resolves its open state: from the `DialogTrigger` above it,
 * unless it is given `open`/`defaultOpen` itself — a controlled overlay with
 * no trigger is the other common shape (`<Modal open={…}>`).
 */
export function useOverlayRoot(props: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}): {
  state: OverlayState;
  renderTrigger: OverlayTriggerRenderer | null;
} {
  const ctx = use(OverlayTriggerContext);
  const localState = useLocalOverlayState(props);
  const isLocal =
    !ctx || props.open !== undefined || props.defaultOpen !== undefined;
  return {
    state: isLocal ? localState : ctx.state,
    renderTrigger: isLocal ? null : ctx.renderTrigger,
  };
}

/**
 * What an overlay wraps its content in, so `useOverlayTriggerState()` inside
 * resolves to *this* overlay — and never to an ancestor's trigger, which is
 * also why the trigger element is hidden from descendants here.
 */
export function OverlayContentProvider(props: {
  state: OverlayState;
  children: ReactNode;
}) {
  const { state, children } = props;
  const value = useMemo<OverlayTriggerContextValue>(
    () => ({ state, renderTrigger: null }),
    [state],
  );
  return (
    <OverlayTriggerContext value={value}>{children}</OverlayTriggerContext>
  );
}
