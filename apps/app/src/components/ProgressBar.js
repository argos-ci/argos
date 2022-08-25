import * as React from "react";
import { x } from "@xstyled/styled-components";

export function ProgressBar({ score, total, ...props }) {
  const progression = Math.min(1, score / total);
  const value = Math.floor(progression * 100);

  return (
    <x.div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin="0"
      aria-valuemax={total}
      w={1}
      h={2}
      backgroundColor="border"
      borderRadius="md"
      {...props}
    >
      <x.div
        ml="-1px"
        w={`calc(${value}% + 2px)`}
        minW={2}
        h={1}
        borderRadius="md"
        backgroundColor={
          progression === 1
            ? "danger"
            : progression > 0.75
            ? "warning"
            : "primary"
        }
      />
    </x.div>
  );
}
