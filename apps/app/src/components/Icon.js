import { x, useFontSize } from "@xstyled/styled-components";

export const Icon = ({ fontSize, ...props }) => {
  const remFontSize = useFontSize(fontSize);

  return (
    <x.div
      flexShrink={0}
      {...(remFontSize ? { size: remFontSize.split("rem")[0] * 16 } : {})}
      {...props}
    />
  );
};
