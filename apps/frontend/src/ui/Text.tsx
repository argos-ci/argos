import { createContext, use, type ComponentPropsWithRef } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";

/**
 * The roles a layout can style text by. `headline` is the subtitle under a
 * `PageHeader`'s title, `description` the body of an `EmptyState`.
 */
export type TextSlot = "headline" | "description";

type TextStyle = { className?: string };

type TextContextValue = TextStyle & {
  /**
   * Styles keyed by slot. A context without `slots` styles every `Text` inside
   * it, whatever slot it asks for.
   */
  slots?: Partial<Record<TextSlot, TextStyle>>;
};

/** Lets a layout style the text inside it, by slot or wholesale. */
export const TextContext = createContext<TextContextValue>({});

/**
 * Text whose style comes from the layout it sits in.
 *
 * `slot` stays on the element: `ListBoxItem` selects on it
 * (`has-[[slot=description]]:flex-wrap`, `**:[[slot=label]]:truncate`), so
 * dropping it from the DOM would break that styling silently.
 */
export function Text({
  slot,
  className,
  ...props
}: ComponentPropsWithRef<"span"> & { slot?: TextSlot }) {
  const context = use(TextContext);
  const style = useTextStyle(context, slot);
  return (
    <span
      {...props}
      slot={slot}
      // `|| undefined` so unstyled text renders no attribute at all rather
      // than `class=""`.
      className={clsx(style?.className, className) || undefined}
    />
  );
}

function useTextStyle(context: TextContextValue, slot: TextSlot | undefined) {
  if (!context.slots) {
    // No slots: the context styles everything under it, slot or not. An
    // unwrapped `Text` lands here too, with an empty context.
    return context;
  }
  invariant(
    slot && context.slots[slot],
    slot
      ? `Invalid Text slot "${slot}". This layout styles ${Object.keys(context.slots).join(", ")}.`
      : `A Text inside this layout needs a slot. Valid slots are ${Object.keys(context.slots).join(", ")}.`,
  );
  return context.slots[slot];
}
