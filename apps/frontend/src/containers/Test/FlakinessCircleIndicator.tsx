import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { useNumberFormatter } from "react-aria";

import { CircleProgress } from "@/ui/Progress";
import { bgSolidColors, lowTextColors } from "@/util/colors";

import { getFlakinessUIColor } from "./Flakiness";

interface FlakinessCircleIndicatorProps extends ComponentPropsWithRef<"div"> {
  value: number;
  label?: string;
}

export function FlakinessCircleIndicator(props: FlakinessCircleIndicatorProps) {
  const { ref, value, label, className, ...domProps } = props;
  const uiColor = getFlakinessUIColor(value);
  const bgColor = bgSolidColors[uiColor];
  const textColor = lowTextColors[uiColor];
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
        color={bgColor}
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
          fill={textColor}
          fontFamily="inherit"
        >
          {label ?? compactFormatter.format(value * 100)}
        </text>
      </svg>
    </div>
  );
}
