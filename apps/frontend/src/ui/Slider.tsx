import { forwardRef } from "react";
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

type SliderProps = RACSliderProps;

export const Slider = forwardRef(function Slider(
  props: SliderProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACSlider
      ref={ref}
      {...props}
      className={clsx(
        "grid grid-cols-[1fr_auto] flex-col [grid-template-areas:'label_output''track_track'] [&>label]:[grid-area:label]",
        props.className,
      )}
    />
  );
});

type SliderOutputProps = RACSliderOutputProps;

export const SliderOutput = forwardRef(function SliderOutput(
  props: SliderOutputProps,
  ref: React.ForwardedRef<HTMLOutputElement>,
) {
  return (
    <RACSliderOutput
      ref={ref}
      {...props}
      className={clsx(
        "text-low text-sm tabular-nums [grid-area:output]",
        props.className,
      )}
    />
  );
});

type SliderTrackProps = RACSliderTrackProps;

export const SliderTrack = forwardRef(function SliderTrack(
  props: SliderTrackProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACSliderTrack
      ref={ref}
      {...props}
      className={clsx(
        "before:bg-border relative h-4 w-full [grid-area:track] before:absolute before:top-1/2 before:block before:h-1 before:w-full before:-translate-y-1/2 before:rounded before:content-['']",
        props.className,
      )}
    />
  );
});

type SliderThumbProps = RACSliderThumbProps;

export const SliderThumb = forwardRef(function SliderThumb(
  props: SliderThumbProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <RACSliderThumb
      ref={ref}
      {...props}
      className={clsx(
        "bg-primary-solid data-[dragging]:bg-primary-solid-active rac-focus top-1/2 size-4 rounded-full",
        props.className,
      )}
    />
  );
});
