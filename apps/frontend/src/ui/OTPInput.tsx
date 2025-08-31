import type { RefAttributes } from "react";
import clsx from "clsx";
import {
  OTPInput as ExtOTPInput,
  REGEXP_ONLY_DIGITS,
  SlotProps,
  type OTPInputProps,
} from "input-otp";

export function OTPInput(
  props: Omit<
    OTPInputProps,
    "maxLength" | "pattern" | "containerClassName" | "render" | "children"
  > &
    RefAttributes<HTMLInputElement>,
) {
  const { className, ...rest } = props;
  return (
    <ExtOTPInput
      {...rest}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      containerClassName={clsx(
        "group flex items-center has-[:disabled]:disabled",
        className,
      )}
      render={({ slots }) => (
        <div className="flex">
          {slots.map((slot, idx) => (
            <Slot key={idx} {...slot} />
          ))}
        </div>
      )}
    />
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={clsx(
        "relative size-16 text-2xl",
        "flex items-center justify-center",
        "transition-all",
        "border border-x-0 border-y border-r first:rounded-l-md first:border-l last:rounded-r-md",
        "group-hover:border-hover group-focus-within:border-hover",
        "group-has-[input[aria-invalid=true]]:border-danger",
        props.isActive && "outline-primary group-focus-within:outline-2",
      )}
    >
      <div className="group-has-[input[data-input-otp-placeholder-shown]]:opacity-20">
        {props.char ?? props.placeholderChar}
      </div>
      {props.hasFakeCaret && <FakeCaret />}
    </div>
  );
}

function FakeCaret() {
  return (
    <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="bg-(--text-color-default) h-8 w-px" />
    </div>
  );
}
