import NextHead from "next/head";
import { useRouter } from "next/router";
import socialImg from "@/images/social.png";

const defaultTitle = "Argos - Detect bugs without writing any test";
const defaultDescription =
  "Argos is a testing platform built for developers, it compares screenshots of your web applications to detect visual regressions.";

export const Head = ({
  title = defaultTitle,
  description = defaultDescription,
  ogType = "website",
  ogImage = socialImg.src,
}: {
  title?: string;
  description?: string;
  ogType?: string;
  ogImage?: string;
}) => {
  const router = useRouter();
  const canonicalUrl = (
    `https://argos-ci.com` + (router.asPath === "/" ? "" : router.asPath)
  ).split("?")[0];
  return (
    <NextHead>
      <title>{title}</title>
      <link rel="canonical" href={canonicalUrl} />
      <meta name="description" content={description} />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <meta name="format-detection" content="telephone=no" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />

      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="argos-ci.com" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </NextHead>
  );
};
