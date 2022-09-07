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
          border={1}
          borderColor="border-active"
          px={3}
          py={1}
          backgroundColor="background"
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
