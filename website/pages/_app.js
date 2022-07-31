import "../styles/globals.css";
import { StrictMode } from "react";
import Head from "next/head";
import { ThemeProvider, Preflight } from "@xstyled/styled-components";
import { theme } from "@components/Theme";
import { AppNavbar } from "@components/Navbar";
import { AppFooter } from "@components/Footer";

function MyApp({ Component, pageProps }) {
  return (
    <StrictMode>
      <Head>
        <title>Argos - Automate visual testing in your CI</title>
        <meta
          name="description"
          content="Argos is a visual testing solution that fits in your workflow to avoid visual regression."
        />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
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
      </Head>
      <ThemeProvider theme={theme}>
        <Preflight />
        <AppNavbar />
        <main>
          <Component {...pageProps} />
        </main>
        <AppFooter />
      </ThemeProvider>
    </StrictMode>
  );
}

export default MyApp;
