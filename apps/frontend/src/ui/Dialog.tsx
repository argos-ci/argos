import { ComponentPropsWithRef, createContext, use, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  Heading,
  OverlayTriggerStateContext,
  Dialog as RACDialog,
  DialogProps as RACDialogProps,
} from "react-aria-components";
import type { OverlayTriggerState } from "react-stately";

import { Button, ButtonProps } from "./Button";
import { ModalActionContext } from "./Modal";
import { usePersistentValue } from "./usePersistentValue";

export { DialogTrigger } from "react-aria-components";

type DialogRole = NonNullable<RACDialogProps["role"]>;

const DialogRoleContext = createContext<DialogRole>("dialog");

export function DialogFooter(props: ComponentPropsWithRef<"div">) {
  const role = use(DialogRoleContext);
  return (
    <div
      {...props}
      className={clsx(
        "bg-subtle flex items-center gap-4 border-t p-4",
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
  return (
    <Heading ref={ref} slot="title" className="mb-4 text-xl font-medium">
      {children}
    </Heading>
  );
}

export function useOverlayTriggerState(): OverlayTriggerState {
  const ctx = use(OverlayTriggerStateContext);
  invariant(
    ctx,
    "useOverlayTriggerState must be used within an OverlayTrigger",
  );
  return ctx;
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
  onPress?: ButtonProps["onPress"];
  single?: boolean;
  isDisabled?: boolean;
}) {
  const { ref, ...rest } = props;
  const state = useOverlayTriggerState();
  const actionContext = use(ModalActionContext);
  return (
    <Button
      ref={ref}
      className={rest.single ? "flex-1 justify-center" : undefined}
      variant="secondary"
      onPress={(event) => {
        props.onPress?.(event);
        state.close();
      }}
      isDisabled={rest.isDisabled || actionContext?.isPending}
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
  props: ButtonProps & { onAction: NonNullable<ButtonProps["onAction"]> },
) {
  const { onAction, ...rest } = props;
  const actionContext = use(ModalActionContext);
  invariant(actionContext, "DialogActionButton must be used within a Modal");
  return (
    <Button
      {...rest}
      isPending={actionContext.isPending ?? undefined}
      onAction={async () => {
        actionContext.setIsPending(true);
        try {
          await onAction();
        } finally {
          actionContext.setIsPending(false);
        }
      }}
    />
  );
}

type DialogProps = RACDialogProps & {
  ref?: React.Ref<HTMLDivElement>;
  size?: "auto" | "medium";
  /**
   * Whether the dialog should be scrollable or not.
   * @default true
   */
  scrollable?: boolean;
};

export function Dialog({
  className,
  size = "auto",
  scrollable = true,
  ...props
}: DialogProps) {
  const { ref, role, ...rest } = props;
  return (
    <DialogRoleContext value={role ?? "dialog"}>
      <RACDialog
        ref={ref}
        role={role}
        className={clsx(
          className,
          "relative max-h-[inherit] max-w-full focus:outline-hidden",
          role === "alertdialog" && size === "auto" ? "w-xl" : null,
          size === "medium" && "w-xl",
          scrollable === false ? "overflow-hidden" : "overflow-auto",
        )}
        {...rest}
      />
    </DialogRoleContext>
  );
}
