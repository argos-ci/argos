import { useFontSize, x } from "@xstyled/styled-components";

/**
 * @param {any} param0
 */
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
