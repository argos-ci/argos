import {
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import {
  ExternalToast,
  Toaster as Sonner,
  toast as sonnerToast,
  ToasterProps,
} from "sonner";

import { useColorMode } from "@/ui/ColorMode";
import { Loader } from "@/ui/Loader";

export function Toaster(props: ToasterProps) {
  const { colorMode } = useColorMode();
  return (
    <Sonner
      theme={colorMode ?? "system"}
      closeButton
      icons={{
        info: (
          <InfoIcon className="size-4 text-(--gray-1) [&_circle]:fill-(--gray-12) [&_circle]:stroke-(--gray-12)" />
        ),
        success: (
          <CircleCheckIcon className="size-4 text-white [&_circle]:fill-(--grass-9) [&_circle]:stroke-(--grass-9)" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-white [&_path:first-child]:fill-(--orange-9) [&_path:first-child]:stroke-(--orange-9)" />
        ),
        error: (
          <CircleXIcon className="size-4 text-white [&_circle]:fill-(--tomato-9) [&_circle]:stroke-(--tomato-9)" />
        ),
        loading: <Loader delay={0} className="text-low size-4" />,
        close: <XIcon className="size-3.5" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "bg-subtle border-thin flex w-(--width) items-start gap-2.5 rounded-xl bg-clip-padding p-3 text-sm shadow-lg",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "text-default font-medium",
          description: "text-low",
          icon: "relative mt-0.5 flex size-4 shrink-0 items-center justify-center",
          // Sonner positions the loader relative to the whole toast; pin it
          // inside the icon slot instead.
          loader: "absolute! inset-0! transform-none!",
          closeButton:
            "text-low hover:text-default hover:bg-hover order-last -mt-1 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-md",
          actionButton:
            "bg-primary-solid hover:bg-primary-solid-hover active:bg-primary-solid-active self-center rounded-sm border border-transparent px-2 py-1 text-xs font-medium text-white",
          cancelButton:
            "text-default hover:bg-hover hover:border-hover active:bg-active self-center rounded-sm border bg-transparent px-2 py-1 text-xs font-medium",
        },
      }}
      {...props}
    />
  );
}

const EMPHASIS_DURATION = 300;
const emphasisTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Scale up a visible toast for a moment to draw attention to it. The `scale`
 * transition declared in index.css animates both legs, so repeated calls
 * hold the toast scaled up instead of replaying the effect from scratch.
 */
function emphasizeToast(testId: string) {
  const element = document.querySelector(
    `[data-sonner-toast][data-testid="${CSS.escape(testId)}"]`,
  );
  if (!(element instanceof HTMLElement)) {
    return;
  }
  element.classList.add("toast-emphasized");
  clearTimeout(emphasisTimers.get(testId));
  emphasisTimers.set(
    testId,
    setTimeout(() => {
      emphasisTimers.delete(testId);
      element.classList.remove("toast-emphasized");
    }, EMPHASIS_DURATION),
  );
}

type ToastCreator = (
  message: React.ReactNode | (() => React.ReactNode),
  data?: ExternalToast,
) => string | number;

/**
 * Wrap a sonner toast creator so that calling it with the id of a toast
 * already on screen zooms that toast instead of just swapping its content.
 */
function withEmphasis<T extends ToastCreator>(create: T): T {
  const wrapped: ToastCreator = (message, data) => {
    if (data?.id == null) {
      return create(message, data);
    }
    const testId = data.testId ?? `toast-${data.id}`;
    const alreadyVisible = sonnerToast
      .getToasts()
      .some((toast) => toast.id === data.id);
    const id = create(message, { ...data, testId });
    if (alreadyVisible) {
      emphasizeToast(testId);
    }
    return id;
  };
  return wrapped as T;
}

/**
 * Same API as sonner's `toast`, but calling it with the id of a toast that is
 * already visible emphasizes it with a zoom animation.
 */
export const toast: typeof sonnerToast = Object.assign(
  withEmphasis(sonnerToast),
  {
    success: withEmphasis(sonnerToast.success),
    info: withEmphasis(sonnerToast.info),
    warning: withEmphasis(sonnerToast.warning),
    error: withEmphasis(sonnerToast.error),
    message: withEmphasis(sonnerToast.message),
    loading: withEmphasis(sonnerToast.loading),
    custom: sonnerToast.custom,
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    getHistory: sonnerToast.getHistory,
    getToasts: sonnerToast.getToasts,
  },
);
