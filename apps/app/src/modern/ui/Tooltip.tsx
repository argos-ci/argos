import {
  useTooltipState as useAriakitTooltipState,
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
} from "ariakit/tooltip";
import {
  forwardRef,
  Children,
  cloneElement,
  createContext,
  useRef,
  useState,
  useMemo,
  useCallback,
  useContext,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import type {
  TooltipProps as AriakitTooltipProps,
  TooltipAnchorOptions,
} from "ariakit/tooltip";

interface TooltipContextValue {
  active: boolean;
  toggle: (value: boolean) => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

export const TooltipProvider = ({
  children,
  delay = 800,
}: {
  children: ReactNode;
  delay?: number;
}) => {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  const toggle = useCallback(
    (value: boolean) => {
      clearTimeoutRef();
      timeoutRef.current = window.setTimeout(() => setActive(value), delay);
    },
    [clearTimeoutRef, delay]
  );
  const value = useMemo(() => ({ active, toggle }), [active, toggle]);
  useEffect(() => clearTimeoutRef, [clearTimeoutRef]);
  return (
    <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
  );
};

export const useTooltipState = () => {
  const ctx = useContext(TooltipContext);
  const [open, setOpen] = useState(false);
  const state = useAriakitTooltipState({
    setOpen: (value) => {
      setOpen(value);
      ctx?.toggle(value);
    },
    open: open && ctx ? ctx.active && open : open,
  });
  return state;
};

export interface TooltipAnchorProps extends TooltipAnchorOptions<"div"> {
  children: React.ReactElement;
}

export const TooltipAnchor = forwardRef<HTMLDivElement, TooltipAnchorProps>(
  ({ children, ...props }, ref) => {
    return (
      <AriakitTooltipAnchor ref={ref} {...props}>
        {(anchorProps) => cloneElement(Children.only(children), anchorProps)}
      </AriakitTooltipAnchor>
    );
  }
);

export type TooltipVariant = "default" | "info";

export interface TooltipProps extends AriakitTooltipProps<"div"> {
  variant?: TooltipVariant | undefined;
}

const variantClassNames: Record<TooltipVariant, string> = {
  default: "text-xxs py-1 px-2",
  info: "text-sm p-2 [&_strong]:font-medium",
};

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ variant = "default", ...props }, ref) => {
    const variantClassName = variantClassNames[variant];
    if (!variantClassName) {
      throw new Error(`Invalid variant: ${variant}`);
    }
    return (
      <AriakitTooltip
        ref={ref}
        className={`${variantClassName} z-10 rounded border border-tooltip-border bg-tooltip-bg text-tooltip-on`}
        {...props}
      />
    );
  }
);

export interface MagicTooltipProps {
  tooltip: React.ReactNode;
  variant?: TooltipVariant;
  children: React.ReactElement;
}

export const MagicTooltip = ({
  tooltip,
  variant,
  children,
}: MagicTooltipProps) => {
  const state = useTooltipState();
  return (
    <>
      <TooltipAnchor state={state}>{children}</TooltipAnchor>
      <Tooltip state={state} variant={variant}>
        {tooltip}
      </Tooltip>
    </>
  );
};
