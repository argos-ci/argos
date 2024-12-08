import { clsx } from "clsx";
import {
  Slider as RACSlider,
  SliderOutput as RACSliderOutput,
  SliderOutputProps as RACSliderOutputProps,
  SliderProps as RACSliderProps,
  SliderThumb as RACSliderThumb,
  SliderThumbProps as RACSliderThumbProps,
  SliderTrack as RACSliderTrack,
  SliderTrackProps as RACSliderTrackProps,
} from "react-aria-components";

type SliderProps = RACSliderProps & {
  ref?: React.ForwardedRef<HTMLDivElement>;
};

export function Slider(props: SliderProps) {
  return (
    <RACSlider
      {...props}
      className={clsx(
        "grid grid-cols-[1fr_auto] flex-col [grid-template-areas:'label_output''track_track'] [&>label]:[grid-area:label]",
        props.className,
      )}
    />
  );
}

type SliderOutputProps = RACSliderOutputProps & {
  ref?: React.ForwardedRef<HTMLOutputElement>;
};

export function SliderOutput(props: SliderOutputProps) {
  return (
    <RACSliderOutput
      {...props}
      className={clsx(
        "text-low text-sm tabular-nums [grid-area:output]",
        props.className,
      )}
    />
  );
}

type SliderTrackProps = RACSliderTrackProps & {
  ref?: React.ForwardedRef<HTMLDivElement>;
};

export function SliderTrack(props: SliderTrackProps) {
  return (
    <RACSliderTrack
      {...props}
      className={clsx(
        "before:bg-border relative h-4 w-full [grid-area:track] before:absolute before:top-1/2 before:block before:h-1 before:w-full before:-translate-y-1/2 before:rounded before:content-['']",
        props.className,
      )}
    />
  );
}

type SliderThumbProps = RACSliderThumbProps & {
  ref?: React.ForwardedRef<HTMLDivElement>;
};

export function SliderThumb(props: SliderThumbProps) {
  return (
    <RACSliderThumb
      {...props}
      className={clsx(
        "bg-primary-solid data-[dragging]:bg-primary-solid-active rac-focus top-1/2 size-4 rounded-full",
        props.className,
      )}
    />
  );
}
