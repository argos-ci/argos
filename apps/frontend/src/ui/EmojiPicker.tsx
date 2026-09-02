import { lazy, Suspense, type ComponentProps } from "react";
import { SmilePlusIcon } from "lucide-react";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { requestIdle } from "@/util/idle";
import { mergeRefs } from "@/util/merge-refs";

import { Button, type ButtonProps } from "./Button";
import { Dialog } from "./Dialog";
import type { Emoji, EmojiPickerProps } from "./EmojiPickerGrid";
import { Loader } from "./Loader";
import { DialogTrigger } from "./Overlay";
import { Popover } from "./Popover";

export { DialogTrigger as EmojiPickerTrigger } from "./Overlay";

const importEmojiPickerGrid = () => import("./EmojiPickerGrid");

/**
 * The picker grid carries the full emojibase dataset — 571 kB of JSON, plus the
 * index it builds at module scope — so it stays out of the static graph: that
 * is what stops it from riding along in the build page's chunk, ahead of the
 * screenshot diffs that are the reason to open the page.
 *
 * Out of the static graph, not off the page: waiting for the click to fetch it
 * put a spinner in front of every first open. So the chunk is warmed as soon as
 * the main thread is free, and the boundary below is only ever seen by someone
 * who opens the picker inside that window.
 */
const EmojiPickerGrid = lazy(importEmojiPickerGrid);

requestIdle(() => {
  // Fire and forget: a rejected warm-up is a preload that didn't help, and
  // opening the picker retries the import and reports the failure for real.
  importEmojiPickerGrid().catch(() => {});
});

/** Placeholder matching the grid's footprint, so the popover does not resize. */
function EmojiPickerFallback() {
  return (
    <div
      aria-busy
      className="text-primary flex h-80 w-77 items-center justify-center"
    >
      <Loader className="size-8" />
    </div>
  );
}

/**
 * The emoji picker grid. Suspends while the emoji dataset loads.
 *
 * Prefer {@link EmojiPickerPopover} unless you are placing the picker in your own
 * overlay.
 */
export function EmojiPicker(props: EmojiPickerProps) {
  return (
    <Suspense fallback={<EmojiPickerFallback />}>
      <EmojiPickerGrid {...props} />
    </Suspense>
  );
}

export type EmojiPickerPopoverProps = Omit<
  ComponentProps<typeof Popover>,
  "children"
> & {
  /** Called with the selected {@link Emoji} (use `emoji.emoji` for the character). */
  onEmojiSelect: (emoji: Emoji) => void;
};

/**
 * An {@link EmojiPicker} rendered inside our {@link Popover}.
 *
 * Pair it with an {@link EmojiPickerTrigger} (re-exported `DialogTrigger`) and a
 * trigger element. The popover closes automatically once an emoji is selected.
 *
 * @example
 * ```tsx
 * <EmojiPickerTrigger>
 *   <Button variant="secondary" iconOnly><SmilePlusIcon /></Button>
 *   <EmojiPickerPopover onEmojiSelect={({ emoji }) => console.log(emoji)} />
 * </EmojiPickerTrigger>
 * ```
 */
export function EmojiPickerPopover(props: EmojiPickerPopoverProps) {
  const { onEmojiSelect, ...popoverProps } = props;
  return (
    <Popover {...popoverProps}>
      <Dialog aria-label="Emoji picker" scrollable={false}>
        {({ close }) => (
          <EmojiPicker
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
  /** Props forwarded to the trigger {@link Button}. */
  buttonProps?: Omit<ButtonProps, "ref">;
};

/**
 * A react-hook-form compatible emoji picker field.
 *
 * It stores the selected emoji character as the field value and renders an
 * {@link Button} trigger that opens an {@link EmojiPickerPopover}.
 */
export function EmojiPickerField<TFieldValues extends FieldValues>(
  props: EmojiPickerFieldProps<TFieldValues>,
) {
  const {
    ref,
    control,
    name,
    buttonProps,
    "aria-label": ariaLabel = "Pick an emoji",
  } = props;
  const { field } = useController({ control, name });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <DialogTrigger>
      <Button
        variant="secondary"
        iconOnly
        aria-label={ariaLabel}
        {...buttonProps}
        ref={mergedRef}
        disabled={field.disabled || buttonProps?.disabled}
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
      </Button>
      <EmojiPickerPopover
        onEmojiSelect={({ emoji }) => {
          field.onChange(emoji);
        }}
      />
    </DialogTrigger>
  );
}
