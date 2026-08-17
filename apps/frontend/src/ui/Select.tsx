import { createContext, use, type ReactNode } from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { clsx } from "clsx";
import { ChevronDownIcon } from "lucide-react";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { FieldErrorContext } from "./FieldError";

/**
 * A control that picks one value from a list.
 *
 * Base UI's select, and nothing else: it shares its look with the menu kit
 * through `menuStyle` and none of its behaviour. A menu runs actions and reads
 * its own children to filter them; this holds a value and hands it back.
 */
export function Select<Value>(props: {
  children: ReactNode;
  value?: Value | null;
  defaultValue?: Value | null;
  onValueChange?: (value: Value | null) => void;
  /**
   * What each value is called, so the trigger can name the chosen one without
   * the list being mounted. Base UI reads it for `SelectValue`.
   */
  items?: Record<string, ReactNode>;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Lays the label beside the control rather than above it. */
  orientation?: "horizontal" | "vertical";
  /** Shown by `SelectValue` until something is chosen. */
  placeholder?: string;
  /** Put on the trigger, for an outside `<label htmlFor>`. */
  id?: string;
  /** Heard from the trigger, which is what react-hook-form marks touched on. */
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  className?: string;
  "aria-label"?: string;
}) {
  const {
    children,
    orientation = "vertical",
    className,
    placeholder,
    id,
    onBlur,
    "aria-label": ariaLabel,
    ...rootProps
  } = props;
  return (
    <BaseSelect.Root {...rootProps}>
      <SelectTriggerIdContext value={id}>
        <SelectPlaceholderContext value={placeholder}>
          <div
            aria-label={ariaLabel}
            onBlur={onBlur}
            className={clsx(
              "group/select flex gap-2",
              { horizontal: "items-center", vertical: "flex-col" }[orientation],
              className,
            )}
          >
            {children}
          </div>
        </SelectPlaceholderContext>
      </SelectTriggerIdContext>
    </BaseSelect.Root>
  );
}

/**
 * What the trigger reads before anything is chosen. Held on `Select` rather
 * than on `SelectValue`, where Base UI puts it, because a placeholder belongs
 * to the control in every other field in the app.
 */
const SelectPlaceholderContext = createContext<string | undefined>(undefined);

/**
 * The id for the trigger, when the select is given one. It belongs on the
 * button rather than the wrapper so an outside `<label htmlFor>` points at
 * something labelable.
 */
const SelectTriggerIdContext = createContext<string | undefined>(undefined);

/** The words for the chosen value, read from the `items` given to `Select`. */
export function SelectValue(props: {
  children?: ReactNode | ((value: unknown) => ReactNode);
  placeholder?: string;
}) {
  const inherited = use(SelectPlaceholderContext);
  return <BaseSelect.Value placeholder={inherited} {...props} />;
}

export type SelectButtonProps = {
  ref?: React.Ref<HTMLButtonElement>;
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
};

/**
 * How a select's control looks. Exported because the build-name filter is a
 * combobox rather than a select — a different Base UI namespace, the same
 * control to the eye.
 */
export function getSelectButtonClassName(options?: { size?: "sm" | "md" }) {
  const { size = "md" } = options ?? {};
  return clsx(
    /* Appearance */
    "bg-app border-thin cursor-default appearance-none rounded-lg shadow-2xs select-none",
    /* Layout */
    "flex items-center justify-between",
    /* Focus */
    "focus-visible:ring-primary-active focus-visible:border-hover focus-visible:ring-2 focus-visible:outline-hidden",
    /* Hover */
    "hover:border-hover",
    /* Disabled */
    "data-disabled:opacity-disabled data-disabled:cursor-not-allowed",
    /* Invalid — only emitted inside a `Field.Root`, which `SelectField` provides */
    "data-invalid:border-danger data-invalid:hover:border-danger-hover",
    /* Placeholder */
    "data-[placeholder]:text-low",
    /* Open */
    "data-popup-open:shadow-none",
    {
      md: "gap-2 px-3 py-1.5 text-base leading-5",
      sm: "gap-2 px-2 py-1 text-sm leading-4",
    }[size],
  );
}

/**
 * The value's own shrinkable box — `*:min-w-0` so the value inside it may
 * shrink too. On a fixed-width control, a value wider than the button (a long
 * channel name, say) would otherwise push the arrow out through the right
 * padding instead of being ellipsized.
 */
export const selectButtonValueClassName =
  "flex min-w-0 flex-1 items-center gap-2 overflow-hidden *:min-w-0";

/**
 * A button that looks like a select's control but opens something else.
 *
 * Three of the build filters are menus wearing a select's clothes.
 * `SelectButton` cannot serve them: it is Base UI's select trigger and throws
 * without a select above it, which is a runtime failure rather than a type
 * one — so they get their own component rather than the temptation.
 */
export function SelectStyleButton(
  props: React.ComponentPropsWithRef<"button"> & { size?: "sm" | "md" },
) {
  const { children, size = "md", className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={clsx(getSelectButtonClassName({ size }), className)}
    >
      <span className={selectButtonValueClassName}>{children}</span>
      <span aria-hidden="true" className="shrink-0">
        <ChevronDownIcon className="size-4" />
      </span>
    </button>
  );
}

/** The control itself: what you press to open the list. */
export function SelectButton(props: SelectButtonProps) {
  const { children, size = "md", className, ...rest } = props;
  const id = use(SelectTriggerIdContext);
  return (
    <BaseSelect.Trigger
      id={id}
      {...rest}
      className={clsx(getSelectButtonClassName({ size }), className)}
    >
      <span className={selectButtonValueClassName}>{children}</span>
      <BaseSelect.Icon
        render={
          <span aria-hidden="true" className="shrink-0">
            <ChevronDownIcon className="size-4" />
          </span>
        }
      />
    </BaseSelect.Trigger>
  );
}

type SelectFieldProps<TFieldValues extends FieldValues> = Omit<
  Parameters<typeof Select>[0],
  "value" | "defaultValue" | "onValueChange" | "name"
> & {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
};

/** A `Select` wired to react-hook-form, error message included. */
export function SelectField<TFieldValues extends FieldValues>(
  props: SelectFieldProps<TFieldValues>,
) {
  const { control, name, disabled, ...rest } = props;
  const { field, fieldState } = useController({ control, name });
  return (
    <Select
      {...rest}
      disabled={field.disabled || disabled}
      name={field.name}
      value={field.value}
      onValueChange={(value) => field.onChange(value)}
    >
      <FieldErrorContext
        value={
          fieldState.error?.message
            ? { message: fieldState.error.message }
            : null
        }
      >
        {rest.children}
      </FieldErrorContext>
    </Select>
  );
}
