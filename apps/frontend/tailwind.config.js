/* eslint-env node */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        progress: {
          from: "var(--violet-8)",
          to: "var(--violet-10)",
        },
      },
      backgroundColor: {
        app: "var(--mauve-1)",
        subtle: "var(--mauve-2)",
        ui: "var(--mauve-3)",
        hover: "var(--mauve-4)",
        active: "var(--mauve-5)",
        solid: {
          DEFAULT: "var(--mauve-9)",
          hover: "var(--mauve-10)",
          active: "var(--mauve-11)",
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
          app: "var(--violet-1)",
          ui: "var(--violet-3)",
          active: "var(--violet-5)",
          solid: {
            DEFAULT: "var(--violet-9)",
            hover: "var(--violet-10)",
            active: "var(--violet-11)",
          },
        },
        danger: {
          app: "var(--tomato-1)",
          subtle: "var(--tomato-2)",
          ui: "var(--tomato-3)",
          hover: "var(--tomato-4)",
          active: "var(--tomato-5)",
          solid: {
            DEFAULT: "var(--tomato-9)",
            hover: "var(--tomato-10)",
            active: "var(--tomato-11)",
          },
        },
        warning: {
          app: "var(--amber-1)",
          ui: "var(--amber-3)",
          active: "var(--amber-5)",
          solid: {
            DEFAULT: "var(--amber-9)",
            hover: "var(--amber-10)",
            active: "var(--amber-11)",
          },
        },
        info: {
          app: "var(--blue-1)",
        },
        pending: {
          app: "var(--amber-1)",
        },
        success: {
          app: "var(--grass-1)",
        },
      },
      textColor: {
        DEFAULT: "var(--mauve-12)",
        low: "var(--mauve-11)",
        primary: {
          DEFAULT: "var(--violet-12)",
          low: "var(--violet-11)",
        },
        danger: {
          DEFAULT: "var(--tomato-12)",
          low: "var(--tomato-11)",
        },
        warning: {
          DEFAULT: "var(--amber-12)",
          low: "var(--amber-11)",
        },
        info: {
          DEFAULT: "var(--blue-12)",
          low: "var(--blue-11)",
        },
        pending: {
          DEFAULT: "var(--amber-12)",
          low: "var(--amber-11)",
        },
        success: {
          DEFAULT: "var(--grass-12)",
          low: "var(--grass-11)",
        },
      },
      ringColor: {
        DEFAULT: "var(--mauve-6)",
        default: "var(--mauve-6)",
        hover: "var(--mauve-8)",
        active: "var(--mauve-9)",
        primary: {
          DEFAULT: "var(--violet-6)",
          ui: "var(--violet-7)",
          hover: "var(--violet-8)",
          active: "var(--violet-9)",
          highlight: "var(--violet-12)",
        },
        danger: {
          DEFAULT: "var(--tomato-6)",
          hover: "var(--tomato-8)",
        },
      },
      borderColor: {
        DEFAULT: "var(--mauve-6)",
        hover: "var(--mauve-8)",
        active: "var(--mauve-9)",
        primary: {
          DEFAULT: "var(--violet-6)",
          ui: "var(--violet-7)",
          hover: "var(--violet-8)",
          active: "var(--violet-9)",
        },
        danger: {
          DEFAULT: "var(--tomato-6)",
          hover: "var(--tomato-8)",
        },
        warning: {
          DEFAULT: "var(--amber-6)",
          hover: "var(--amber-8)",
        },
        info: {
          DEFAULT: "var(--blue-6)",
          hover: "var(--blue-8)",
        },
        pending: {
          DEFAULT: "var(--amber-6)",
          hover: "var(--amber-8)",
        },
        success: {
          DEFAULT: "var(--grass-6)",
          hover: "var(--grass-8)",
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
      ringWidth: {
        3: "3px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("tailwindcss/plugin")(({ addVariant }) => {
      addVariant("search-cancel", "&::-webkit-search-cancel-button");
    }),
  ],
};
