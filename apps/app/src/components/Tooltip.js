import { x } from "@xstyled/styled-components";
import {
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
  TooltipArrow,
  useTooltipState as ariakitUseTooltipState,
} from "ariakit/tooltip";
import { forwardRef } from "react";

export { TooltipArrow };

export function useTooltipState(props) {
  return ariakitUseTooltipState({ placement: "bottom", ...props });
}

export const Hotkey = (props) => (
  <x.div
    fontSize="10px"
    lineHeight={1}
    p={1}
    color="hotkey-on"
    backgroundColor="hotkey-bg"
    borderRadius="base"
    minW={4}
    {...props}
  />
);

export const TooltipHotkey = ({ children, ...props }) => (
  <>
    <x.div>·</x.div>
    <Hotkey {...props}>{children}</Hotkey>
  </>
);

export const TooltipAnchor = forwardRef(({ children, as, ...props }, ref) => {
  return (
    <AriakitTooltipAnchor ref={ref} {...props}>
      {(tooltipAnchorProps) => (
        <x.div outline={{ focus: "none" }} as={as} {...tooltipAnchorProps}>
          {children}
        </x.div>
      )}
    </AriakitTooltipAnchor>
  );
});

export const Tooltip = forwardRef(({ children, ...props }, ref) => {
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
          zIndex={200}
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
});

export const ParagraphTooltip = forwardRef(({ children, ...props }, ref) => {
  return (
    <AriakitTooltip ref={ref} {...props}>
      {(tooltipProps) => (
        <x.div
          {...tooltipProps}
          maxW={416}
          p={2}
          borderRadius="md"
          boxShadow="paragraphTooltip"
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
});
