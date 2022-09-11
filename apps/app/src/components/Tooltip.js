import * as React from "react";
import { x } from "@xstyled/styled-components";
import {
  Tooltip as AriakitTooltip,
  TooltipAnchor,
  useTooltipState,
  TooltipArrow,
} from "ariakit/tooltip";

export { TooltipAnchor, useTooltipState, TooltipArrow };

export const Tooltip = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <AriakitTooltip ref={ref} {...props}>
      {(tooltipProps) => (
        <x.div
          {...tooltipProps}
          px={3}
          py={1}
          backgroundColor="tooltip"
          borderRadius="md"
          fontWeight="500"
        >
          <TooltipArrow />
          {children}
        </x.div>
      )}
    </AriakitTooltip>
  );
});
