import React from "react";
import { x } from "@xstyled/styled-components";

export function ProgressBar({ score, total, ...props }) {
  const progression = Math.min(1, score / total);

  return (
    <x.div w={1} h={2} backgroundColor="border" borderRadius="md" {...props}>
      <x.div
        ml="-1px"
        w={`calc(${Math.floor(progression * 100)}% + 2px)`}
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
