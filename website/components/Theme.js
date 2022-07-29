import {
  th,
  defaultTheme,
  generateHexAlphaVariants,
} from "@xstyled/styled-components";

export const theme = {
  ...defaultTheme,

  colors: {
    ...defaultTheme.colors,

    ...generateHexAlphaVariants({
      "primary-50": defaultTheme.colors["purple-50"],
      "primary-100": defaultTheme.colors["purple-100"],
      "primary-200": defaultTheme.colors["purple-200"],
      "primary-300": defaultTheme.colors["purple-300"],
      "primary-400": defaultTheme.colors["purple-400"],
      "primary-500": defaultTheme.colors["purple-500"],
      "primary-600": defaultTheme.colors["purple-600"],
      "primary-700": defaultTheme.colors["purple-700"],
      "primary-800": defaultTheme.colors["purple-800"],
      "primary-900": defaultTheme.colors["purple-900"],
    }),

    danger: th.color("red-500"),
    warning: th.color("yellow-500"),
    success: th.color("green-500"),

    "body-background": "#151a2d",
    "background-secondary": "#001320",
    "background-dark": th.color("gray-900"),

    title: th.color("blue-gray-100"),
    secondary: th.color("blue-gray-300"),
    border: th.color("gray-500"),
    outline: th.color("light-blue-600"),
  },
  screens: {
    _: 0,
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};
