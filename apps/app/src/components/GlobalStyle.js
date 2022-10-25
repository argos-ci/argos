import * as React from "react";
import { createGlobalStyle, Preflight } from "@xstyled/styled-components";

// Source : https://www.joshwcomeau.com/css/custom-css-reset/
export const ArgosGlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    scroll-behavior: smooth;
  }

  * {
    margin: 0;
  }

  html,
  body,
  #root {
    height: 100%;
    background-color: bg;
    color: primary-text;
    font-family: default;
  }

  body {
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    font-family: default;
  }

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  input,
  button,
  textarea,
  select {
    font: inherit;
  }

  p,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    overflow-wrap: break-word;
  }

  a {
    color: inherit;

    &:hover {
      text-decoration: none;
    }
  }

  /* Default outline on buttons */
  button:focus {
    outline: none;
  }

  button:focus-visible {
    outline: 1px dotted;
    outline: 5px auto -webkit-focus-ring-color;
  }
`;

export const GlobalStyle = () => (
  <>
    <ArgosGlobalStyle />
    <Preflight />
  </>
);
