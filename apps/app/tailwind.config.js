/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Color classes
        primary: colors.purple,
        info: colors.sky,
        warning: colors.orange,
        danger: colors.red,
        success: colors.green,
        neutral: colors.gray,
        pending: colors.amber,

        // Global colors
        bg: colors.black,
        on: colors.slate[50],
        "on-light": colors.slate[400],
        border: colors.slate[700],
        text: colors.slate[50],

        // Components
        tooltip: {
          bg: colors.slate[900],
          border: colors.slate[800],
          on: colors.slate[50],
        },

        code: {
          bg: colors.slate[700],
          on: colors.slate[50],
        },

        "icon-button": {
          on: colors.slate[400],
          neutral: {
            "hover-border": colors.slate[700],
            "hover-on": colors.slate[300],
            "active-bg": colors.slate[800],
          },
          danger: {
            "hover-border": colors.red[700],
            "hover-on": colors.red[300],
            "active-bg": colors.red[900],
          },
          success: {
            "hover-border": colors.green[700],
            "hover-on": colors.green[300],
            "active-bg": colors.green[900],
          },
        },

        tab: {
          on: colors.slate[400],
          "hover-on": colors.slate[200],
          "selected-on": colors.slate[50],
        },

        menu: {
          bg: colors.slate[900],
          border: colors.slate[800],
          on: colors.slate[300],
          "on-title": colors.slate[400],
          "hover-on": colors.slate[50],
          item: {
            "hover-bg": colors.slate[800],
          },
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
      fontFamily: {
        sans: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","Fira Sans","Droid Sans","Helvetica Neue",sans-serif',
      },
      borderRadius: {
        chip: "20px",
      },
    },
  },
  plugins: [],
};
