const withMDX = require("@next/mdx")({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
    providerImportSource: "@mdx-js/react",
  },
});

module.exports = {
  ...withMDX({
    i18n: {
      locales: ["en"],
      defaultLocale: "en",
    },
    pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  }),

  async redirects() {
    return [
      {
        source: "/:organization/:repository/builds/:path*",
        destination:
          "https://app.argos-ci.com/:organization/:repository/builds/:path*",
        permanent: false,
      },
    ];
  },
};
