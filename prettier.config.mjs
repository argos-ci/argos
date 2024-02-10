export default {
  plugins: [
    "@trivago/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  importOrder: ["^@/", "^@argos-ci/", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  tailwindConfig: "./apps/app/tailwind.config.js",
  tailwindFunctions: ["clsx", "twc"],
};
