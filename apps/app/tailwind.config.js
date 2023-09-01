/* eslint-env node */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      backgroundColor: {
        app: "hsl(var(--mauve1) / <alpha-value>)",
        subtle: "hsl(var(--mauve2) / <alpha-value>)",
        ui: "hsl(var(--mauve3) / <alpha-value>)",
        hover: "hsl(var(--mauve4) / <alpha-value>)",
        active: "hsl(var(--mauve5) / <alpha-value>)",
        solid: {
          DEFAULT: "hsl(var(--mauve9) / <alpha-value>)",
          hover: "hsl(var(--mauve10) / <alpha-value>)",
          active: "hsl(var(--mauve11) / <alpha-value>)",
        },
        github: {
          DEFAULT: "rgb(36 41 46 / <alpha-value>)",
          hover: "rgb(85 85 85 / <alpha-value>)",
          active: "rgb(85 85 85 / <alpha-value>)",
        },
        gitlab: {
          DEFAULT: "rgb(226 67 41 / <alpha-value>)",
          hover: "rgb(252 109 38 / <alpha-value>)",
          active: "rgb(252 109 38 / <alpha-value>)",
        },
        primary: {
          app: "hsl(var(--violet1) / <alpha-value>)",
          ui: "hsl(var(--violet3) / <alpha-value>)",
          active: "hsl(var(--violet5) / <alpha-value>)",
          solid: {
            DEFAULT: "hsl(var(--violet9) / <alpha-value>)",
            hover: "hsl(var(--violet10) / <alpha-value>)",
            active: "hsl(var(--violet11) / <alpha-value>)",
          },
        },
        danger: {
          app: "hsl(var(--tomato1) / <alpha-value>)",
          subtle: "hsl(var(--tomato2) / <alpha-value>)",
          ui: "hsl(var(--tomato3) / <alpha-value>)",
          hover: "hsl(var(--tomato4) / <alpha-value>)",
          active: "hsl(var(--tomato5) / <alpha-value>)",
          solid: {
            DEFAULT: "hsl(var(--tomato9) / <alpha-value>)",
            hover: "hsl(var(--tomato10) / <alpha-value>)",
            active: "hsl(var(--tomato11) / <alpha-value>)",
          },
        },
        warning: {
          app: "hsl(var(--amber1) / <alpha-value>)",
          ui: "hsl(var(--amber3) / <alpha-value>)",
          active: "hsl(var(--amber5) / <alpha-value>)",
          solid: {
            DEFAULT: "hsl(var(--amber9) / <alpha-value>)",
            hover: "hsl(var(--amber10) / <alpha-value>)",
            active: "hsl(var(--amber11) / <alpha-value>)",
          },
        },
        info: {
          app: "hsl(var(--blue1) / <alpha-value>)",
        },
        pending: {
          app: "hsl(var(--amber1) / <alpha-value>)",
        },
        success: {
          app: "hsl(var(--grass1) / <alpha-value>)",
        },
      },
      textColor: {
        DEFAULT: "hsl(var(--mauve12) / <alpha-value>)",
        low: "hsl(var(--mauve11) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--violet12) / <alpha-value>)",
          low: "hsl(var(--violet11) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--tomato12) / <alpha-value>)",
          low: "hsl(var(--tomato11) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--amber12) / <alpha-value>)",
          low: "hsl(var(--amber11) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--blue12) / <alpha-value>)",
          low: "hsl(var(--blue11) / <alpha-value>)",
        },
        pending: {
          DEFAULT: "hsl(var(--amber12) / <alpha-value>)",
          low: "hsl(var(--amber11) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--grass12) / <alpha-value>)",
          low: "hsl(var(--grass11) / <alpha-value>)",
        },
      },
      ringColor: {
        DEFAULT: "hsl(var(--mauve6) / <alpha-value>)",
        default: "hsl(var(--mauve6) / <alpha-value>)",
        hover: "hsl(var(--mauve8) / <alpha-value>)",
        active: "hsl(var(--mauve9) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--violet6) / <alpha-value>)",
          ui: "hsl(var(--violet7) / <alpha-value>)",
          hover: "hsl(var(--violet8) / <alpha-value>)",
          active: "hsl(var(--violet9) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--tomato6) / <alpha-value>)",
          hover: "hsl(var(--tomato8) / <alpha-value>)",
        },
      },
      borderColor: {
        DEFAULT: "hsl(var(--mauve6) / <alpha-value>)",
        hover: "hsl(var(--mauve8) / <alpha-value>)",
        active: "hsl(var(--mauve9) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--violet6) / <alpha-value>)",
          ui: "hsl(var(--violet7) / <alpha-value>)",
          hover: "hsl(var(--violet8) / <alpha-value>)",
          active: "hsl(var(--violet9) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--tomato6) / <alpha-value>)",
          hover: "hsl(var(--tomato8) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--amber6) / <alpha-value>)",
          hover: "hsl(var(--amber8) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--blue6) / <alpha-value>)",
          hover: "hsl(var(--blue8) / <alpha-value>)",
        },
        pending: {
          DEFAULT: "hsl(var(--amber6) / <alpha-value>)",
          hover: "hsl(var(--amber8) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--grass6) / <alpha-value>)",
          hover: "hsl(var(--grass8) / <alpha-value>)",
        },
      },
      fontSize: {
        xxs: [
          "0.6875rem",
          {
            lineHeight: "1rem",
          },
        ],
      },
      opacity: {
        disabled: 0.38,
      },
      fontFamily: {
        sans: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","Fira Sans","Droid Sans","Helvetica Neue",sans-serif',
      },
      borderRadius: {
        chip: "20px",
      },
      aria: {
        invalid: 'invalid="true"',
      },
    },
  },
  plugins: [require("windy-radix-palette"), require("tailwindcss-animate")],
};
