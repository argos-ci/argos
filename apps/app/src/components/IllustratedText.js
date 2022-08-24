import React from "react";
import { x } from "@xstyled/styled-components";
import { Icon } from "./Icon";

export const IllustratedText = ({
  icon: LocalIcon,
  children,
  reverse,
  fontSize,
  ...props
}) => {
  return (
    <x.span columnGap={1} alignItems="center" fontSize={fontSize} {...props}>
      {reverse ? (
        <>
          {children} <Icon as={LocalIcon} fontSize={fontSize} />
        </>
      ) : (
        <>
          <Icon as={LocalIcon} fontSize={fontSize} /> {children}
        </>
      )}
    </x.span>
  );
};
