import {
  defaultTheme,
  DefaultTheme,
  th,
  generateHexAlphaVariants,
} from "@xstyled/styled-components";

export interface Theme extends DefaultTheme {
  defaultColorModeName: string;
  fonts: DefaultTheme["fonts"] & {
    default: string;
  };
  colors: any;
  texts: DefaultTheme["texts"] & {
    h1: any;
    "h1-sm": any;
    h2: any;
    quote: any;
    "feature-title": any;
    teaser: any;
    "teaser-sm": any;
  };
  radii: DefaultTheme["radii"] & {
    chip: string;
  };
}

export const theme: Theme = {
  ...defaultTheme,
  defaultColorModeName: "dark",
  fonts: {
    ...defaultTheme.fonts,
    default:
      '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","Fira Sans","Droid Sans","Helvetica Neue",sans-serif',
  },
  texts: {
    ...defaultTheme.texts,
    h1: {
      fontSize: "6xl",
      lineHeight: 1.1,
      fontWeight: "bold",
      color: "title",
    },
    "h1-sm": {
      fontSize: "4xl",
      lineHeight: "2.5rem",
      fontWeight: "bold",
      color: "title",
    },
    h2: {
      fontSize: "2rem",
      lineHeight: 1.25,
      fontWeight: "bold",
      color: "title",
    },
    quote: {
      fontSize: "3xl",
      color: "darker",
      fontWeight: "medium",
      lineHeight: 1.15,
    },
    "feature-title": {
      fontSize: "default",
      color: "title",
      lineHeight: 1.5,
      fontWeight: "semibold",
    },
    teaser: {
      fontSize: "xl",
      lineHeight: "1.75rem",
      color: "on-light",
    },
    "teaser-sm": {
      fontSize: "lg",
      lineHeight: "1.75rem",
      color: "on-light",
    },
  },
  colors: {
    ...defaultTheme.colors,
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

    link: th.color("primary-600"),

    "feature-primary-bg": th.color("primary-50"),
    "feature-orange-bg": th.color("orange-50"),
    "feature-green-bg": th.color("green-50"),
    "feature-primary-icon": th.color("primary-600"),
    "feature-orange-icon": th.color("orange-600"),
    "feature-green-icon": th.color("green-600"),

    "primary-focus-ring": th.color("primary-300"),
    "secondary-focus-ring": th.color("secondary-300"),

    "button-primary-bg": th.color("primary-600"),
    "button-primary-bg-hover": th.color("primary-700"),
    "button-primary-outline": th.color("primary-600"),
    "button-primary-outline-hover": th.color("primary-800"),
    "button-secondary-bg": th.color("secondary-600"),
    "button-secondary-bg-hover": th.color("secondary-700"),
    "button-secondary-outline": th.color("secondary-600"),
    "button-secondary-outline-hover": th.color("secondary-800"),
    "button-contained-text": th.color("white"),

    "chip-on": th.color("primary-600"),
    "chip-bg": th.color("primary-50"),
    "chip-bg-hover": th.color("primary-100"),

    "hero-bg": th.color("sky-100-a60"),

    "testimonials-bg-top": th.color("fuchsia-200-a30"),
    "testimonials-bg-bottom": th.color("sky-200-a30"),

    modes: {
      dark: {
        "on-dark": th.color("white"),
        on: th.color("slate-100"),
        "on-light": th.color("slate-400"),
        "primary-border": th.color("primary-800"),
        "layout-border": th.color("slate-800"),
        lighter: th.color("black"),
        darker: th.color("white"),

        link: th.color("primary-400"),

        "primary-focus-ring": th.color("primary-700"),
        "secondary-focus-ring": th.color("secondary-700"),

        "button-primary-bg": th.color("primary-600"),
        "button-primary-bg-hover": th.color("primary-600"),
        "button-primary-outline": th.color("primary-400"),
        "button-primary-outline-hover": th.color("primary-200"),
        "button-secondary-bg": th.color("secondary-700"),
        "button-secondary-bg-hover": th.color("secondary-600"),
        "button-secondary-outline": th.color("secondary-400"),
        "button-secondary-outline-hover": th.color("secondary-200"),

        "feature-primary-bg": th.color("primary-900"),
        "feature-orange-bg": th.color("orange-900"),
        "feature-green-bg": th.color("green-900"),
        "feature-primary-icon": th.color("primary-300"),
        "feature-orange-icon": th.color("orange-300"),
        "feature-green-icon": th.color("green-300"),

        "chip-on": th.color("primary-300"),
        "chip-bg": th.color("primary-900-a50"),
        "chip-bg-hover": th.color("primary-900"),

        "hero-bg": th.color("blue-800-a30"),

        "testimonials-bg-top": th.color("fuchsia-800-a30"),
        "testimonials-bg-bottom": th.color("blue-800-a30"),
      },
    },
  },
  radii: {
    ...defaultTheme.radii,
    chip: "20px",
  },
};
