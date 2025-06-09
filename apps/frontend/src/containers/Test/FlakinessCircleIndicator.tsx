import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { useNumberFormatter } from "react-aria";

import { CircleProgress } from "@/ui/Progress";
import { bgSolidColors } from "@/util/colors";

import { getFlakinessUIColor } from "./Flakiness";

interface FlakinessCircleIndicatorProps extends ComponentPropsWithRef<"div"> {
  value: number;
  label?: string;
  color?: string;
}

function getColor(value: number) {
  const uiColor = getFlakinessUIColor(value);
  return bgSolidColors[uiColor];
}

export function FlakinessCircleIndicator(props: FlakinessCircleIndicatorProps) {
  const {
    ref,
    value,
    label,
    className,
    color = getColor(value),
    ...domProps
  } = props;
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  return (
    <div
      ref={ref}
      {...domProps}
      className={clsx("relative aspect-square select-none", className)}
    >
      <CircleProgress
        radius={48}
        strokeWidth={12}
        value={value}
        min={0}
        max={1}
        color={color}
      />
      <svg
        className="absolute inset-0"
        viewBox="0 0 96 96"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <text
          x="50%"
          y="52%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="28"
          fontWeight="bold"
          fill={color}
          fontFamily="inherit"
        >
          {label ?? compactFormatter.format(value * 100)}
        </text>
      </svg>
    </div>
  );
}
