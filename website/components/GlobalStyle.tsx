import { th, createGlobalStyle, Preflight } from "@xstyled/styled-components";

const ArgosGlobalStyle = createGlobalStyle`
  html, body {
    font-family: ${th.font("default")};
    background-color: lighter;
    color: on;
    accent-color: ${th.color("primary-500")};
  }

  #content {
    contain: paint;
  }


  body:not(.xstyled-color-mode-dark) {
    .dark-mode-only {
      display: none !important;
    }
  }

  body.xstyled-color-mode-dark {
    color-scheme: dark;
    
    .testimonial {
      filter: brightness(0) invert(1);
    }

    .light-mode-only {
      display: none !important;
    }
  }

  @keyframes slide {
    from {
      transform: translateX(0%);
    }
    to {
      transform: translateX(-50%);
    }
  }
`;

export const GlobalStyle: React.FC<{}> = () => (
  <>
    <Preflight />
    <ArgosGlobalStyle />
  </>
);
