import { Slider as BaseSlider } from "@base-ui/react/slider";
import { clsx } from "clsx";

export function Slider(props: BaseSlider.Root.Props) {
  return (
    <BaseSlider.Root
      {...props}
      className={clsx(
        "grid grid-cols-[1fr_auto] flex-col [grid-template-areas:'label_output''track_track'] [&>label]:[grid-area:label]",
        props.className,
      )}
    />
  );
}

/**
 * The slider's own label part rather than `ui/Label`.
 *
 * `ui/Label` is react-aria's, which takes its association from whichever
 * react-aria field wraps it. Inside a Base UI slider there is no such context,
 * so it would render an unassociated `<label>` and the slider would lose its
 * accessible name — visible to nothing but a screen reader.
 */
export function SliderLabel(props: BaseSlider.Label.Props) {
  return (
    <BaseSlider.Label
      {...props}
      className={clsx("mb-2 inline-block text-sm font-medium", props.className)}
    />
  );
}

export function SliderOutput(props: BaseSlider.Value.Props) {
  return (
    <BaseSlider.Value
      {...props}
      className={clsx(
        "text-low text-sm tabular-nums [grid-area:output]",
        props.className,
      )}
    />
  );
}

/**
 * The hit area and the rail. react-aria had one element for both, drawing the
 * rail as a `before:` pseudo-element on the box the pointer works against; Base
 * UI splits them, so `Control` keeps the box and `Track` becomes the rail
 * itself. The thumb goes inside `Track`, which is what positions it.
 */
export function SliderTrack(props: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { className, children } = props;
  return (
    <BaseSlider.Control
      className={clsx("relative h-4 w-full [grid-area:track]", className)}
    >
      <BaseSlider.Track className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-sm bg-(--border-color-default)">
        {children}
      </BaseSlider.Track>
    </BaseSlider.Control>
  );
}

export function SliderThumb(props: BaseSlider.Thumb.Props) {
  return (
    <BaseSlider.Thumb
      {...props}
      className={clsx(
        "bg-primary-solid data-dragging:bg-primary-solid-active size-4 rounded-full",
        // The focusable element is the hidden input inside the thumb, so the
        // ring keys off that rather than the thumb itself.
        "has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--violet-10)",
        props.className,
      )}
    />
  );
}
