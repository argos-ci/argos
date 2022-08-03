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
      "primary-50": defaultTheme.colors["violet-50"],
      "primary-100": defaultTheme.colors["violet-100"],
      "primary-200": defaultTheme.colors["violet-200"],
      "primary-300": defaultTheme.colors["violet-300"],
      "primary-400": defaultTheme.colors["violet-400"],
      "primary-500": defaultTheme.colors["violet-500"],
      "primary-600": defaultTheme.colors["violet-600"],
      "primary-700": defaultTheme.colors["violet-700"],
      "primary-800": defaultTheme.colors["violet-800"],
      "primary-900": defaultTheme.colors["violet-900"],
    }),

    danger: th.color("red-500"),
    warning: th.color("yellow-500"),
    success: th.color("green-500"),

    bg: th.color("black"),
    "editor-bg": th.color("blue-gray-900"),
    "editor-line-number": th.color("blue-gray-600"),
    "editor-line-number-bg": "rgba(0, 0, 0, 0.2)",
    "browser-bg": th.color("blue-gray-900"),
    "alternate-bg": th.color("blue-gray-900-a60"),
    "accent-bg": th.color("primary-900-a30"),
    border: th.color("blue-gray-800"),

    on: th.color("white"),
    "on-light": th.color("blue-gray-500"),
    "on-accent": th.color("primary-300"),
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
