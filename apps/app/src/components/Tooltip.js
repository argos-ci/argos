import { x } from "@xstyled/styled-components";
import {
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
  TooltipArrow,
  useTooltipState as ariakitUseTooltipState,
} from "ariakit/tooltip";
import { forwardRef } from "react";

import { Hotkey, HotkeySeparator } from "./Hotkey";

export { TooltipArrow };

export function useTooltipState(props) {
  return ariakitUseTooltipState({ placement: "bottom", ...props });
}

export const TooltipHotkey = ({ children }) => (
  <>
    <HotkeySeparator />
    <Hotkey>{children}</Hotkey>
  </>
);

export const TooltipAnchor = forwardRef(
  /**
   * @param {any} param0
   * @param {any} ref
   */
  ({ children, as, ...props }, ref) => {
    return (
      <AriakitTooltipAnchor ref={ref} {...props}>
        {(tooltipAnchorProps) => (
          <x.div
            outline={{ focus: "none" }}
            w="fit-content"
            as={as}
            {...tooltipAnchorProps}
          >
            {children}
          </x.div>
        )}
      </AriakitTooltipAnchor>
    );
  }
);

export const Tooltip = forwardRef(
  /**
   * @param {any} param0
   * @param {any} ref
   */
  ({ children, ...props }, ref) => {
    return (
      <AriakitTooltip ref={ref} {...props}>
        {(tooltipProps) => (
          <x.div
            {...tooltipProps}
            fontSize="11px"
            lineHeight="16px"
            border={1}
            py={1}
            px={2}
            borderRadius="base"
            zIndex={700}
            display="flex"
            alignItems="center"
            gap={1}
            backgroundColor="tooltip-bg"
            borderColor="tooltip-border"
          >
            {children}
          </x.div>
        )}
      </AriakitTooltip>
    );
  }
);

export const ParagraphTooltip = forwardRef(
  /**
   * @param {any} param0
   * @param {any} ref
   */
  ({ children, ...props }, ref) => {
    return (
      <AriakitTooltip ref={ref} {...props}>
        {(tooltipProps) => (
          <x.div
            {...tooltipProps}
            maxW={416}
            p={2}
            borderRadius="md"
            boxShadow="dialog"
            fontSize="sm"
            lineHeight="16px"
            border={1}
            borderColor="tooltip-border"
            backgroundColor="tooltip-bg"
          >
            {children}
          </x.div>
        )}
      </AriakitTooltip>
    );
  }
);
