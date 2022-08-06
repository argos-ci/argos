import { StrictMode } from "react";
import Head from "next/head";
import {
  ThemeProvider,
  Preflight,
  createGlobalStyle,
} from "@xstyled/styled-components";
import { theme } from "@components/Theme";
import { AppNavbar } from "@components/Navbar";
import { AppFooter } from "@components/Footer";

const GlobalStyle = createGlobalStyle`
  html,
  body {
    padding: 0;
    margin: 0;
    color: on;
    background-color: bg;
    -webkit-font-smoothing: antialiased;
  }

  #__next {
    display: grid;
    grid-template-rows: min-content auto min-content;
    grid-template-columns: minmax(200px, 1fr);
    height: 100vh;
  }
`;

const App = ({ Component, pageProps }) => {
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
        <GlobalStyle />
        <Preflight />
        <AppNavbar />
        <main>
          <Component {...pageProps} />
        </main>
        <AppFooter />
      </ThemeProvider>
    </StrictMode>
  );
};

export default App;
