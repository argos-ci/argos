import Document, { Html, Head, Main, NextScript } from "next/document";
import {
  ServerStyleSheet,
  getColorModeInitScriptElement,
} from "@xstyled/styled-components";
import type { DocumentContext } from "next/document";

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);
      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html>
        <Head>
          <link
            href="https://fonts.googleapis.com/css?family=Inter:400,500,600,700&display=swap"
            rel="stylesheet"
          />
          <script
            defer
            data-domain="argos-ci.com"
            src="https://plausible.io/js/script.js"
          ></script>
        </Head>
        <body>
          {getColorModeInitScriptElement()}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
