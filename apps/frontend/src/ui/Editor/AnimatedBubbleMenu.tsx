import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";
import { BubbleMenu } from "@tiptap/react/menus";

export type AnimatedBubbleMenuProps = ComponentPropsWithoutRef<
  typeof BubbleMenu
> & {
  animationDurationMs: number;
};

export function AnimatedBubbleMenu(props: AnimatedBubbleMenuProps) {
  const { animationDurationMs, options, ...rest } = props;
  const elementRef = useRef<HTMLDivElement | null>(null);
  const restoreRemoveRef = useRef<(() => void) | null>(null);
  const cancelExitRef = useRef<(() => void) | null>(null);

  const cancelExit = useCallback(() => {
    const cancel = cancelExitRef.current;
    if (!cancel) {
      return;
    }
    cancel();
    cancelExitRef.current = null;
  }, []);

  const showWithAnimation = useCallback(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    cancelExit();
    element.style.visibility = "visible";
    element.style.opacity = "1";
    element.dataset.toolbarAnimation = "enter";
  }, [cancelExit]);

  const setElementRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (elementRef.current === element) {
        return;
      }

      restoreRemoveRef.current?.();
      restoreRemoveRef.current = null;
      elementRef.current = element;

      if (!element) {
        return;
      }

      const remove = element.remove.bind(element);
      const removeDescriptor = Object.getOwnPropertyDescriptor(
        element,
        "remove",
      );

      Object.defineProperty(element, "remove", {
        configurable: true,
        value: () => {
          if (!element.isConnected) {
            remove();
            return;
          }

          cancelExit();
          element.style.visibility = "visible";
          element.style.opacity = "1";
          element.dataset.toolbarAnimation = "exit";

          let timeoutId: number | null = null;

          const cleanup = () => {
            if (timeoutId !== null) {
              window.clearTimeout(timeoutId);
            }
            element.removeEventListener("animationend", handleAnimationEnd);
          };

          const finish = () => {
            cleanup();
            if (cancelExitRef.current === cleanup) {
              cancelExitRef.current = null;
            }
            element.removeAttribute("data-toolbar-animation");
            remove();
          };

          const handleAnimationEnd = (event: AnimationEvent) => {
            if (event.target === element) {
              finish();
            }
          };

          element.addEventListener("animationend", handleAnimationEnd);
          timeoutId = window.setTimeout(finish, animationDurationMs);
          cancelExitRef.current = cleanup;
        },
      });

      restoreRemoveRef.current = () => {
        cancelExit();
        if (removeDescriptor) {
          Object.defineProperty(element, "remove", removeDescriptor);
        } else {
          delete (element as { remove?: HTMLDivElement["remove"] }).remove;
        }
      };
    },
    [animationDurationMs, cancelExit],
  );

  useEffect(() => {
    return () => {
      restoreRemoveRef.current?.();
      restoreRemoveRef.current = null;
    };
  }, []);

  const animatedOptions = useMemo(
    () => ({
      ...(options ?? {}),
      onShow: () => {
        showWithAnimation();
        options?.onShow?.();
      },
      onHide: () => {
        options?.onHide?.();
      },
      onDestroy: () => {
        cancelExit();
        options?.onDestroy?.();
      },
    }),
    [cancelExit, options, showWithAnimation],
  );

  return <BubbleMenu {...rest} ref={setElementRef} options={animatedOptions} />;
}
