import { StrictMode } from "react";
import Head from "next/head";
import { ThemeProvider, ColorModeProvider } from "@xstyled/styled-components";
import { theme } from "@/components/Theme";
import { GlobalStyle } from "@/components/GlobalStyle";
import type { AppProps } from "next/app";
import { AppNavbar } from "@/containers/AppNavbar";
import { AppFooter } from "@/containers/AppFooter";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <StrictMode>
      <Head>
        <title>Argos - Automate visual testing in your CI</title>
        <meta
          name="description"
          content="Argos is a visual testing solution that fits in your workflow to avoid visual regression."
        />
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
      </Head>
      <ThemeProvider theme={theme}>
        <ColorModeProvider>
          <GlobalStyle />
          <div id="content">
            <AppNavbar />
            <main>
              <Component {...pageProps} />
            </main>
            <AppFooter />
          </div>
        </ColorModeProvider>
      </ThemeProvider>
    </StrictMode>
  );
};

export default App;
