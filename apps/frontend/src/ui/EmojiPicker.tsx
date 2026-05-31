import { clsx } from "clsx";
import {
  EmojiPicker as Frimousse,
  type Emoji,
  type EmojiPickerRootProps,
} from "frimousse";
import { SmilePlusIcon } from "lucide-react";
import { DialogTrigger, type PopoverProps } from "react-aria-components";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

import { Dialog } from "./Dialog";
import { IconButton, type IconButtonProps } from "./IconButton";
import { Popover } from "./Popover";

export { DialogTrigger as EmojiPickerTrigger } from "react-aria-components";

export type EmojiPickerProps = Omit<EmojiPickerRootProps, "children">;

/**
 * A styled emoji picker built on top of {@link https://frimousse.liveblocks.io | frimousse}.
 *
 * It is meant to be rendered inside an overlay such as {@link EmojiPickerPopover}.
 */
export function EmojiPicker(props: EmojiPickerProps) {
  return (
    <Frimousse.Root
      {...props}
      className={clsx("isolate flex h-92 w-79 flex-col", props.className)}
    >
      <Frimousse.Search
        autoFocus
        placeholder="Search emoji…"
        className={clsx(
          "bg-app text-default placeholder:text-placeholder z-10 m-1 appearance-none rounded-sm border px-3 py-1.5 text-sm leading-tight",
          "focus:border-active focus:outline-hidden",
        )}
      />
      <Frimousse.Viewport className="relative flex-1 outline-hidden">
        <Frimousse.Loading className="text-low absolute inset-0 flex items-center justify-center text-sm">
          Loading…
        </Frimousse.Loading>
        <Frimousse.Empty className="text-low absolute inset-0 flex items-center justify-center text-sm">
          {({ search }) =>
            search ? `No emoji found for “${search}”` : "No emoji found."
          }
        </Frimousse.Empty>
        <Frimousse.List
          className="pb-1 select-none"
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div
                {...props}
                className="bg-subtle text-low px-2 pt-2.5 pb-1 text-xs font-medium"
              >
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div {...props} className="scroll-my-1 px-1">
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                {...props}
                className="data-active:bg-active flex size-8 items-center justify-center rounded-sm text-lg"
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </Frimousse.Viewport>
    </Frimousse.Root>
  );
}

export type EmojiPickerPopoverProps = Omit<PopoverProps, "children"> & {
  /** Called with the selected frimousse {@link Emoji} (use `emoji.emoji` for the character). */
  onEmojiSelect: (emoji: Emoji) => void;
} & Pick<EmojiPickerProps, "locale" | "skinTone" | "columns">;

/**
 * An {@link EmojiPicker} rendered inside our {@link Popover}.
 *
 * Pair it with an {@link EmojiPickerTrigger} (re-exported `DialogTrigger`) and a
 * trigger element. The popover closes automatically once an emoji is selected.
 *
 * @example
 * ```tsx
 * <EmojiPickerTrigger>
 *   <IconButton><SmilePlusIcon /></IconButton>
 *   <EmojiPickerPopover onEmojiSelect={({ emoji }) => console.log(emoji)} />
 * </EmojiPickerTrigger>
 * ```
 */
export function EmojiPickerPopover(props: EmojiPickerPopoverProps) {
  const { onEmojiSelect, locale, skinTone, columns, ...popoverProps } = props;
  return (
    <Popover {...popoverProps}>
      <Dialog aria-label="Emoji picker" scrollable={false}>
        {({ close }) => (
          <EmojiPicker
            locale={locale}
            skinTone={skinTone}
            columns={columns}
            onEmojiSelect={(emoji) => {
              onEmojiSelect(emoji);
              close();
            }}
          />
        )}
      </Dialog>
    </Popover>
  );
}

export type EmojiPickerFieldProps<TFieldValues extends FieldValues> = {
  ref?: React.Ref<HTMLButtonElement>;
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  /** Accessible label for the trigger button. */
  "aria-label"?: string;
  /** Props forwarded to the trigger {@link IconButton}. */
  buttonProps?: Omit<IconButtonProps, "ref">;
} & Pick<EmojiPickerProps, "locale" | "skinTone" | "columns">;

/**
 * A react-hook-form compatible emoji picker field.
 *
 * It stores the selected emoji character as the field value and renders an
 * {@link IconButton} trigger that opens an {@link EmojiPickerPopover}.
 */
export function EmojiPickerField<TFieldValues extends FieldValues>(
  props: EmojiPickerFieldProps<TFieldValues>,
) {
  const {
    ref,
    control,
    name,
    buttonProps,
    locale,
    skinTone,
    columns,
    "aria-label": ariaLabel = "Pick an emoji",
  } = props;
  const { field } = useController({ control, name });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <DialogTrigger>
      <IconButton
        aria-label={ariaLabel}
        {...buttonProps}
        ref={mergedRef}
        isDisabled={field.disabled || buttonProps?.isDisabled}
        onBlur={(event) => {
          field.onBlur();
          buttonProps?.onBlur?.(event);
        }}
      >
        {field.value ? (
          <span className="text-base leading-none">{field.value}</span>
        ) : (
          <SmilePlusIcon />
        )}
      </IconButton>
      <EmojiPickerPopover
        locale={locale}
        skinTone={skinTone}
        columns={columns}
        onEmojiSelect={({ emoji }) => {
          field.onChange(emoji);
        }}
      />
    </DialogTrigger>
  );
}
