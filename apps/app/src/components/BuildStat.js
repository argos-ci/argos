import * as React from "react";
import { Tooltip, TooltipAnchor, useTooltipState } from "./Tooltip";
import { IllustratedText } from "./IllustratedText";
import { LinkBlock } from "./Link";

export function BuildStat({ icon, color, count, label, ...props }) {
  const tooltip = useTooltipState();

  if (count === 0) return null;

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <LinkBlock px={2} py={1} {...props}>
          <IllustratedText icon={icon} color={color} cursor="default">
            {count}
          </IllustratedText>
        </LinkBlock>
      </TooltipAnchor>
      <Tooltip state={tooltip}>{label}</Tooltip>
    </>
  );
}
