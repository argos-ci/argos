import { useRef, type ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

const backdropClassName = clsx(
  "z-dialog fixed inset-0 bg-black/15 backdrop-blur-sm",
  "data-open:animate-in data-open:fade-in data-open:duration-200 data-open:ease-out",
  "data-closed:animate-out data-closed:fade-out data-closed:duration-200 data-closed:ease-in",
);

/**
 * A modal panel sliding up from the bottom edge, for surfaces that are
 * sidebars on desktop. Built on the same Base UI primitives as `Modal` so
 * dismissal (Escape, backdrop) and focus behave the same.
 */
export function BottomSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  "aria-label": string;
  children: ReactNode;
  /** Height class of the panel, e.g. `h-[85dvh]`. Defaults to content height. */
  className?: string;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <BaseDialog.Root open={props.open} onOpenChange={props.onOpenChange} modal>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={backdropClassName} />
        <BaseDialog.Viewport className="z-dialog fixed inset-x-0 top-0 flex h-dvh flex-col justify-end">
          <BaseDialog.Popup
            ref={popupRef}
            aria-label={props["aria-label"]}
            // Same load-bearing marker as `Modal`: the build hotkeys treat
            // events from inside it as belonging to the dialog.
            data-modal=""
            initialFocus={popupRef}
            className={clsx(
              "bg-app border-t-thin flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none",
              "data-open:animate-in data-open:slide-in-from-bottom data-open:duration-300 data-open:ease-out",
              "data-closed:animate-out data-closed:slide-out-to-bottom data-closed:duration-200 data-closed:ease-in data-closed:fill-mode-forwards",
              props.className,
            )}
          >
            <div
              aria-hidden
              className="bg-hover mx-auto mt-2 mb-1 h-1 w-10 shrink-0 rounded-full"
            />
            {props.children}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
