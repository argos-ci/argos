import { x } from "@xstyled/styled-components";

import {
  getDiffStatusColor,
  getDiffStatusIcon,
} from "@/containers/ScreenshotDiffStatus";

import { IllustratedText } from "./IllustratedText";
import {
  Tooltip,
  TooltipAnchor,
  TooltipHotkey,
  useTooltipState,
} from "./Tooltip";

export function BuildStat({ icon, color, count, label, hotkey, ...props }) {
  const tooltip = useTooltipState();

  if (count === 0) return null;

  return (
    <>
      <TooltipAnchor state={tooltip} px={2} py={1} h="24px" {...props}>
        <IllustratedText icon={icon} color={color} cursor="default">
          {count}
        </IllustratedText>
      </TooltipAnchor>
      <Tooltip state={tooltip}>
        {label}
        {hotkey && <TooltipHotkey>{hotkey}</TooltipHotkey>}
      </Tooltip>
    </>
  );
}

export function BuildStatLink({ status, count, label, ...props }) {
  if (count === 0) return null;
  const capitalizedLabel = `${label.slice(0, 1).toUpperCase()}${label.slice(
    1
  )}`;

  return (
    <BuildStat
      icon={getDiffStatusIcon(status)}
      color={getDiffStatusColor(status)}
      count={count}
      as="button"
      outline={{ focus: "none" }}
      backgroundColor={{
        _: "bg",
        focus: "background-focus",
        hover: "bg-hover",
      }}
      borderRadius="md"
      cursor="pointer"
      label={capitalizedLabel}
      {...props}
    />
  );
}

export const BuildStatLinks = (props) => (
  <x.div
    display="flex"
    px={4}
    py="5px"
    borderBottom={1}
    borderColor="layout-border"
    justifyContent="flex-start"
    fontSize="sm"
    ml="-10px"
    gap={1}
    {...props}
  />
);
