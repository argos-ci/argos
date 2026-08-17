import {
  ComponentPropsWithRef,
  createContext,
  use,
  useId,
  useState,
  type ReactNode,
} from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";

import { Button, ButtonProps } from "./Button";
import { ModalActionContext } from "./Modal";
import { useOverlayTriggerState } from "./Overlay";
import { usePersistentValue } from "./usePersistentValue";

export { DialogTrigger, useOverlayTriggerState } from "./Overlay";

type DialogRole = "dialog" | "alertdialog";

const DialogRoleContext = createContext<DialogRole>("dialog");

/** Set by `Dialog`, read by `DialogTitle` so the dialog can label itself. */
const DialogTitleIdContext = createContext<string | undefined>(undefined);

export function DialogFooter(props: ComponentPropsWithRef<"div">) {
  const role = use(DialogRoleContext);
  return (
    <div
      {...props}
      className={clsx(
        "bg-subtle border-t-thin flex items-center gap-4 p-4",
        role === "alertdialog"
          ? "flex-wrap justify-center *:[[role=alert]]:basis-full *:[[role=alert]]:text-center"
          : "justify-end",
        props.className,
      )}
    />
  );
}

export function DialogText(props: ComponentPropsWithRef<"p">) {
  return <p {...props} className={clsx("my-4 text-base", props.className)} />;
}

export function DialogBody(props: ComponentPropsWithRef<"div">) {
  const role = use(DialogRoleContext);
  return (
    <div
      {...props}
      className={clsx(
        "p-4",
        role === "alertdialog" && "text-center",
        props.className,
      )}
    />
  );
}

export function DialogTitle(props: {
  ref?: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode;
}) {
  const { ref, children } = props;
  const id = use(DialogTitleIdContext);
  return (
    <h2 ref={ref} id={id} className="mb-4 text-xl font-medium">
      {children}
    </h2>
  );
}

/**
 * Create a dialog value state that can be used for controlled dialogs.
 */
export function useDialogValueState<S>(initialState: S | (() => S)) {
  const [state, setState] = useState<S | null>(initialState);
  const persistentState = usePersistentValue(state);
  return {
    isOpen: Boolean(state),
    onOpenChange: (open: boolean) => {
      if (!open) {
        setState(null);
      }
    },
    open: (value: S) => setState(value),
    value: persistentState,
  };
}

export function DialogDismiss(props: {
  ref?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
  onClick?: () => void;
  single?: boolean;
  disabled?: boolean;
}) {
  const { ref, ...rest } = props;
  const state = useOverlayTriggerState();
  const actionContext = use(ModalActionContext);
  return (
    <Button
      ref={ref}
      className={rest.single ? "flex-1 justify-center" : undefined}
      variant="secondary"
      onPress={() => {
        props.onClick?.();
        state.close();
      }}
      isDisabled={rest.disabled || actionContext?.isPending}
    >
      {rest.children}
    </Button>
  );
}

/**
 * Run an asynchronous action from a dialog button. While the action is
 * running, the button is pending and the modal is flagged as pending: it can't
 * be dismissed (Escape / backdrop) and `DialogDismiss` buttons are disabled.
 * Must be used within a Modal. For form dialogs use `<Form>`, which wires this
 * up automatically.
 */
export function DialogActionButton(
  props: ButtonProps & {
    onAsyncAction: NonNullable<ButtonProps["onAsyncAction"]>;
  },
) {
  const { onAsyncAction, ...rest } = props;
  const actionContext = use(ModalActionContext);
  invariant(actionContext, "DialogActionButton must be used within a Modal");
  return (
    <Button
      {...rest}
      isPending={actionContext.isPending ?? undefined}
      onAsyncAction={async () => {
        actionContext.setIsPending(true);
        try {
          await onAsyncAction();
        } finally {
          actionContext.setIsPending(false);
        }
      }}
    />
  );
}

type DialogProps = {
  ref?: React.Ref<HTMLDivElement>;
  role?: DialogRole;
  className?: string;
  "aria-label"?: string;
  /**
   * The dialog's content — or a function of the overlay state, for content
   * that closes the dialog itself.
   */
  children?: ReactNode | ((state: { close: () => void }) => ReactNode);
  size?: "auto" | "medium";
  /**
   * Whether the dialog should be scrollable or not.
   * @default true
   */
  scrollable?: boolean;
};

/**
 * The dialog itself, inside a `Modal` or a `Popover`.
 *
 * This element carries the `dialog` / `alertdialog` role, exactly as it did on
 * react-aria — the overlay popup around it stays `presentation` — so
 * `getByRole("dialog")` keeps finding one element, and its box.
 */
export function Dialog({
  className,
  size = "auto",
  scrollable = true,
  ...props
}: DialogProps) {
  const { ref, role, children, "aria-label": ariaLabel, ...rest } = props;
  const state = useOverlayTriggerState();
  const titleId = useId();
  return (
    <DialogRoleContext value={role ?? "dialog"}>
      <DialogTitleIdContext value={ariaLabel ? undefined : titleId}>
        <div
          ref={ref}
          role={role ?? "dialog"}
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : titleId}
          className={clsx(
            className,
            "relative max-h-[inherit] max-w-full focus:outline-hidden",
            role === "alertdialog" && size === "auto" ? "w-xl" : null,
            size === "medium" && "w-xl",
            scrollable === false ? "overflow-hidden" : "overflow-auto",
          )}
          {...rest}
        >
          {typeof children === "function"
            ? children({ close: state.close })
            : children}
        </div>
      </DialogTitleIdContext>
    </DialogRoleContext>
  );
}
