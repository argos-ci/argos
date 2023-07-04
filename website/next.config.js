const withMDX = require("@next/mdx")({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = withMDX({
  reactStrictMode: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  redirects: async () => {
    return [
      {
        source: "/docs",
        destination: "/docs/installation",
        permanent: false,
      },
      {
        source: "/:organization/:repository/builds/:path*",
        destination:
          "https://app.argos-ci.com/:organization/:repository/builds/:path*",
        permanent: false,
      },
      {
        source: "/discord",
        destination: "https://discord.gg/WjzGrQGS4A",
        permanent: false,
      },
    ];
  },
  rewrites: async () => {
    return [
      {
        source: "/docs/:path*",
        destination: "https://argos-docs.vercel.app/:path*", // The :path parameter is used here so will not be automatically passed in the query
      },
    ];
  },
});

module.exports = nextConfig;
