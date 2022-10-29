import { x } from "@xstyled/styled-components";
import { Icon } from "./Icon";

export const IllustratedText = ({
  icon: LocalIcon,
  children,
  reverse,
  fontSize,
  field,
  ...props
}) => {
  return (
    <x.span
      fontSize={fontSize}
      {...(field ? { display: "flex", alignItems: "center", gap: 2 } : {})}
      {...props}
    >
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
