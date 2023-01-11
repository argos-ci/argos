import "@/styles/globals.css";
import { StrictMode } from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import { AppNavbar } from "@/containers/AppNavbar";
import { AppFooter } from "@/containers/AppFooter";
import { Inter } from "@next/font/google";

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ["latin"] });

const title = "Argos - Detect bugs without writing any test";
const description =
  "Argos is a testing platform built for developers, it compares screenshots of your web applications to detect visual regressions.";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <StrictMode>
      <Head>
        <title>{title}</title>
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

        <meta property="og:url" content="https://argos-ci.com" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://argos-ci.com/social.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="argos-ci.com" />
        <meta property="twitter:url" content="https://argos-ci.com" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>
      <div id="content" className={inter.className}>
        <AppNavbar />
        <main>
          <Component {...pageProps} />
        </main>
        <AppFooter />
      </div>
    </StrictMode>
  );
};

export default App;
