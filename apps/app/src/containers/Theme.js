import React from "react";
import { theme as suiTheme } from "@smooth-ui/core-sc";
import {
  css,
  ThemeProvider,
  ColorModeProvider,
  rpxTransformers,
} from "@xstyled/styled-components";

const theme = {
  ...suiTheme,
  useColorSchemeMediaQuery: false,
  useCustomProperties: false,
  initialColorModeName: "light",
  defaultColorModeName: "dark",
  space: {
    ...suiTheme,
    ...[0, 4, 8, 16, 24, 48, 96, 144, 192, 240],
  },
  colors: {
    ...suiTheme.colors,
    gray900: "#242830",
    gray800: "#2c323e",
    gray700: "#424752",
    gray600: "#8A94A7",
    gray400: "#E7E9F3",
    gray300: "#dce3f6",
    gray200: "#f2f4fb",
    gray100: "#FDFEFF",
    primary: "#6344CE",
  },
  sizes: {
    ...suiTheme.sizes,
    container: 1040,
  },
  transformers: {
    ...rpxTransformers,
  },
  texts: {
    headline: {
      style: css`
        max-width: 500; // Don't use more space than the title.
        margin-bottom: 3;
      `,
    },
    h2: {
      defaultAs: "h2",
      style: css`
        font-size: 18;
        font-weight: normal;
        margin: 3 0;
      `,
    },
  },
};

export function ThemeInitializer({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <ColorModeProvider>{children}</ColorModeProvider>
    </ThemeProvider>
  );
}
