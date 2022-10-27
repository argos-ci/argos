import * as React from "react";
import { Tooltip, TooltipAnchor, useTooltipState } from "./Tooltip";
import { IllustratedText } from "./IllustratedText";

export function BuildStat({ icon, color, count, label }) {
  const tooltip = useTooltipState();

  if (count === 0) return null;

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <IllustratedText icon={icon} color={color} cursor="default">
          {count}
        </IllustratedText>
      </TooltipAnchor>
      <Tooltip state={tooltip}>{label}</Tooltip>
    </>
  );
}
