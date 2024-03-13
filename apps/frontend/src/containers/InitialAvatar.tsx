import { forwardRef } from "react";
import { clsx } from "clsx";

export type InitialAvatar = {
  className?: string;
  size?: number;
  color: string;
  initial: string;
};

export const InitialAvatar = forwardRef<any, InitialAvatar>((props, ref) => {
  const size = props.size ?? 32;
  return (
    <div
      ref={ref}
      className={clsx(
        props.className,
        "flex select-none items-center justify-center rounded-full",
      )}
      style={{
        backgroundColor: props.color,
        width: size,
        height: size,
      }}
    >
      <svg width="100%" height="100%" viewBox="-50 -66 100 100">
        <text
          fill="white"
          fontWeight="600"
          textAnchor="middle"
          fontSize="50"
          fontFamily="Inter, sans-serif"
        >
          {props.initial}
        </text>
      </svg>
    </div>
  );
});
