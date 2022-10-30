import { x } from "@xstyled/styled-components";

import {
  getDiffStatusColor,
  getDiffStatusIcon,
} from "../containers/ScreenshotDiffStatus";
import { IllustratedText } from "./IllustratedText";
import { LinkBlock } from "./Link";
import { Tooltip, TooltipAnchor, useTooltipState } from "./Tooltip";

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

export function BuildStatLink({ status, count, label, onClick }) {
  if (count === 0) return null;

  return (
    <BuildStat
      icon={getDiffStatusIcon(status)}
      color={getDiffStatusColor(status)}
      count={count}
      label={label}
      onClick={() => onClick(status)}
    />
  );
}

export const BuildStatLinks = (props) => (
  <x.div
    display="flex"
    px={4}
    py={2}
    borderBottom={1}
    borderColor="layout-border"
    justifyContent="flex-start"
    fontSize="sm"
    h="38px"
    ml="-10px"
    {...props}
  />
);
