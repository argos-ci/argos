import * as React from "react";
import {
  defaultTheme,
  ThemeProvider,
  aliasColor,
  th,
  generateHexAlphaVariants,
} from "@xstyled/styled-components";

const oldColors = {
  ...aliasColor("primary", "violet"),
  primary: defaultTheme.colors["violet-700"],

  "highlight-background": defaultTheme.colors["gray-900"],
  "background-hover": defaultTheme.colors["gray-700-a60"],
  "background-active": defaultTheme.colors["gray-800-a60"],
  "background-focus": defaultTheme.colors["blue-gray-700-a50"],
  "code-background": defaultTheme.colors["gray-700-a80"],

  border: defaultTheme.colors["gray-700-a80"],
  "border-active": defaultTheme.colors["gray-300"],

  "secondary-text": defaultTheme.colors["gray-400"],
  tooltip: defaultTheme.colors["gray-700"],
};

const newColors = {
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",

  "purple-50": "#faf5ff",
  "purple-100": "#f3e8ff",
  "purple-200": "#e9d5ff",
  "purple-300": "#d8b4fe",
  "purple-400": "#c084fc",
  "purple-500": "#a855f7",
  "purple-600": "#9333ea",
  "purple-700": "#7e22ce",
  "purple-800": "#6b21a8",
  "purple-900": "#581c87",

  "red-50": "#fef2f2",
  "red-100": "#fee2e2",
  "red-200": "#fecaca",
  "red-300": "#fca5a5",
  "red-400": "#f87171",
  "red-500": "#ef4444",
  "red-600": "#dc2626",
  "red-700": "#b91c1c",
  "red-800": "#991b1b",
  "red-900": "#7f1d1d",

  "orange-50": "#fff7ed",
  "orange-100": "#ffedd5",
  "orange-200": "#fed7aa",
  "orange-300": "#fdba74",
  "orange-400": "#fb923c",
  "orange-500": "#f97316",
  "orange-600": "#ea580c",
  "orange-700": "#c2410c",
  "orange-800": "#9a3412",
  "orange-900": "#7c2d12",

  "green-50": "#f0fdf4",
  "green-100": "#dcfce7",
  "green-200": "#bbf7d0",
  "green-300": "#86efac",
  "green-400": "#4ade80",
  "green-500": "#22c55e",
  "green-600": "#16a34a",
  "green-700": "#15803d",
  "green-800": "#166534",
  "green-900": "#14532d",

  "yellow-50": "#fefce8",
  "yellow-100": "#fef9c3",
  "yellow-200": "#fef08a",
  "yellow-300": "#fde047",
  "yellow-400": "#facc15",
  "yellow-500": "#eab308",
  "yellow-600": "#ca8a04",
  "yellow-700": "#a16207",
  "yellow-800": "#854d0e",
  "yellow-900": "#713f12",

  "primary-50": th.color("purple-50"),
  "primary-100": th.color("purple-100"),
  "primary-200": th.color("purple-200"),
  "primary-300": th.color("purple-300"),
  "primary-400": th.color("purple-400"),
  "primary-500": th.color("purple-500"),
  "primary-600": th.color("purple-600"),
  "primary-700": th.color("purple-700"),
  "primary-800": th.color("purple-800"),
  "primary-900": th.color("purple-900"),
  "primary-900-a50": th.color("purple-900-a50"),

  "secondary-50": th.color("slate-50"),
  "secondary-100": th.color("slate-100"),
  "secondary-200": th.color("slate-200"),
  "secondary-300": th.color("slate-300"),
  "secondary-400": th.color("slate-400"),
  "secondary-500": th.color("slate-500"),
  "secondary-600": th.color("slate-600"),
  "secondary-700": th.color("slate-700"),
  "secondary-800": th.color("slate-800"),
  "secondary-900": th.color("slate-900"),

  ...generateHexAlphaVariants({
    "fuchsia-50": "#fdf4ff",
    "fuchsia-100": "#fae8ff",
    "fuchsia-200": "#f5d0fe",
    "fuchsia-300": "#f0abfc",
    "fuchsia-400": "#e879f9",
    "fuchsia-500": "#d946ef",
    "fuchsia-600": "#c026d3",
    "fuchsia-700": "#a21caf",
    "fuchsia-800": "#86198f",
    "fuchsia-900": "#701a75",

    "sky-50": "#f0f9ff",
    "sky-100": "#e0f2fe",
    "sky-200": "#bae6fd",
    "sky-300": "#7dd3fc",
    "sky-400": "#38bdf8",
    "sky-500": "#0ea5e9",
    "sky-600": "#0284c7",
    "sky-700": "#0369a1",
    "sky-800": "#075985",
    "sky-900": "#0c4a6e",
  }),

  "on-dark": th.color("black"),
  on: th.color("slate-900"),
  "on-light": th.color("slate-500"),
  "primary-border": th.color("purple-200"),
  "layout-border": th.color("slate-200"),
  lighter: th.color("white"),
  darker: th.color("black"),

  link: th.color("sky-600"),
  bg: th.color("lighter"),
  "primary-text": th.color("on"),

  "primary-on": th.color("primary-700"),
  "primary-bg": th.color("primary-50"),
  "primary-bg-hover": th.color("primary-100"),

  info: th.color("sky-500"),
  "info-on": th.color("sky-700"),
  "info-bg": th.color("sky-50"),
  "info-bg-hover": th.color("sky-100"),

  success: th.color("green-500"),
  "success-on": th.color("green-700"),
  "success-bg": th.color("green-50"),
  "success-bg-hover": th.color("green-100"),

  neutral: th.color("slate-500"),
  "neutral-on": th.color("slate-700"),
  "neutral-bg": th.color("slate-50"),
  "neutral-bg-hover": th.color("slate-100"),

  pending: th.color("yellow-500"),
  "pending-on": th.color("yellow-700"),
  "pending-bg": th.color("yellow-50"),
  "pending-bg-hover": th.color("yellow-100"),

  warning: th.color("orange-500"),
  "warning-on": th.color("orange-700"),
  "warning-bg": th.color("orange-50"),
  "warning-bg-hover": th.color("orange-100"),

  danger: th.color("red-500"),
  "danger-on": th.color("red-700"),
  "danger-bg": th.color("red-50"),
  "danger-bg-hover": th.color("red-100"),

  "button-primary-bg": th.color("primary-600"),
  "button-primary-bg-hover": th.color("primary-700"),
  "button-primary-outline": th.color("primary-600"),
  "button-primary-outline-hover": th.color("primary-800"),
  "button-secondary-bg": th.color("secondary-600"),
  "button-secondary-bg-hover": th.color("secondary-700"),
  "button-secondary-outline": th.color("secondary-600"),
  "button-secondary-outline-hover": th.color("secondary-800"),
  "button-contained-text": th.color("white"),

  "icon-button-primary-on": th.color("slate-500"),
  "icon-button-primary-bg": "transparent",
  "icon-button-primary-on-hover": th.color("slate-700"),
  "icon-button-primary-bg-hover": th.color("slate-50"),
  "icon-button-primary-bg-active": th.color("slate-100"),

  "icon-button-danger-on": th.color("slate-700"),
  "icon-button-danger-bg": th.color("slate-100"),
  "icon-button-danger-on-hover": th.color("red-700"),
  "icon-button-danger-bg-hover": th.color("red-50"),
  "icon-button-danger-bg-active": th.color("red-100"),

  "badge-primary-on": th.color("white"),
  "badge-primary-bg": th.color("slate-600"),

  "badge-secondary-on": th.color("on"),
  "badge-secondary-bg": th.color("lighter"),

  modes: {
    dark: {
      "on-dark": th.color("white"),
      on: th.color("slate-100"),
      "on-light": th.color("slate-400"),
      "primary-border": th.color("primary-800"),
      "layout-border": th.color("slate-800"),
      lighter: th.color("black"),
      darker: th.color("white"),

      link: th.color("sky-600-a90"),

      "primary-on": th.color("primary-200"),
      "primary-bg": th.color("primary-900-a50"),
      "primary-bg-hover": th.color("primary-900-a80"),

      "info-on": th.color("sky-200"),
      "info-bg": th.color("sky-900-a50"),
      "info-bg-hover": th.color("sky-900-a80"),

      "success-on": th.color("green-200"),
      "success-bg": th.color("green-900-a50"),
      "success-bg-hover": th.color("green-900-a80"),

      "neutral-on": th.color("slate-200"),
      "neutral-bg": th.color("slate-800"),
      "neutral-bg-hover": th.color("slate-700"),

      "pending-on": th.color("yellow-200"),
      "pending-bg": th.color("yellow-900-a50"),
      "pending-bg-hover": th.color("yellow-900-a80"),

      "warning-on": th.color("orange-200"),
      "warning-bg": th.color("orange-900-a50"),
      "warning-bg-hover": th.color("orange-900-a80"),

      "danger-on": th.color("red-200"),
      "danger-bg": th.color("red-900-a50"),
      "danger-bg-hover": th.color("red-900-a80"),

      "button-primary-bg": th.color("primary-600"),
      "button-primary-bg-hover": th.color("primary-600"),
      "button-primary-outline": th.color("primary-400"),
      "button-primary-outline-hover": th.color("primary-200"),
      "button-secondary-bg": th.color("secondary-700"),
      "button-secondary-bg-hover": th.color("secondary-600"),
      "button-secondary-outline": th.color("secondary-400"),
      "button-secondary-outline-hover": th.color("secondary-200"),

      "icon-button-primary-on": th.color("slate-300"),
      "icon-button-primary-bg": "transparent",
      "icon-button-primary-on-hover": th.color("slate-100"),
      "icon-button-primary-bg-hover": th.color("slate-900"),
      "icon-button-primary-bg-active": th.color("slate-800"),

      "icon-button-danger-on": th.color("slate-300"),
      "icon-button-danger-bg": th.color("slate-800"),
      "icon-button-danger-on-hover": th.color("red-800"),
      "icon-button-danger-bg-hover": th.color("slate-900"),
      "icon-button-danger-bg-active": th.color("slate-800"),
    },
  },
};

export const theme = {
  ...defaultTheme,
  fonts: {
    ...defaultTheme.fonts,
    default:
      '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","Fira Sans","Droid Sans","Helvetica Neue",sans-serif',
  },
  defaultColorModeName: "dark",
  useCustomProperties: false,
  colors: {
    ...defaultTheme.colors,
    ...oldColors,
    ...newColors,
  },
  radii: {
    ...defaultTheme.radii,
    chip: "20px",
  },
  sizes: {
    ...defaultTheme.sizes,
    container: 1040,
  },
};

export function ThemeInitializer({ children }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
