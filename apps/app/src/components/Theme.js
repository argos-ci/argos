import React from "react";
import {
  defaultTheme,
  ThemeProvider,
  aliasColor,
} from "@xstyled/styled-components";

export const theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,

    ...aliasColor("primary", "violet"),
    primary: defaultTheme.colors["violet-700"],

    background: "black",
    "highlight-background": defaultTheme.colors["gray-900"],
    "background-hover": defaultTheme.colors["gray-700-a50"],
    "background-active": defaultTheme.colors["gray-800"],
    "background-focus": defaultTheme.colors["blue-gray-700-a50"],

    border: defaultTheme.colors["gray-700-a80"],
    "border-active": defaultTheme.colors["gray-300"],

    link: defaultTheme.colors["blue-500"],
    "primary-text": "white",
    "secondary-text": defaultTheme.colors["gray-400"],
  },
  sizes: {
    ...defaultTheme.sizes,
    container: 1040,
  },
};

export function ThemeInitializer({ children }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
