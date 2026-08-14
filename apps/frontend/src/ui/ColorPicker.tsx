import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { clsx } from "clsx";

/**
 * A row of colour swatches, one of which is selected.
 *
 * react-aria had a dedicated colour-swatch picker that parsed the colour and
 * painted the swatch for you. Base UI has no colour components, and this only
 * ever needed "pick one of a fixed list", which is a toggle group — so the
 * colour is a plain CSS string throughout rather than a parsed `Color` object.
 */
export function ColorSwatchPicker(props: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { value, onChange, className, children } = props;
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(groupValue) => {
        // Single-select: the group hands back every pressed value, and the one
        // just pressed is last. Ignore an empty array so clicking the current
        // swatch cannot leave the overlay with no colour at all.
        const next = groupValue.at(-1);
        if (next) {
          onChange(next);
        }
      }}
      className={clsx("flex flex-wrap gap-2", className)}
    >
      {children}
    </ToggleGroup>
  );
}

export function ColorSwatchPickerItem(props: {
  color: string;
  className?: string;
}) {
  const { color, className } = props;
  return (
    <Toggle
      value={color}
      aria-label={color}
      className={clsx(
        "focus-ring relative w-fit rounded-sm outline-hidden forced-color-adjust-none",
        "data-pressed:ring-primary-active data-pressed:ring-1 data-pressed:ring-offset-1",
        className,
      )}
    >
      <ColorSwatch color={color} />
    </Toggle>
  );
}

function ColorSwatch(props: { color: string; className?: string }) {
  return (
    <div
      className={clsx("size-6 rounded-sm border", props.className)}
      style={{ backgroundColor: props.color }}
    />
  );
}
