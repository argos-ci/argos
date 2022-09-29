import Head from "next/head";
import styled from "@xstyled/styled-components";
import { Container } from "@/components/Container";

const Wrapper = styled.div`
  @media print {
    *,
    *:before,
    *:after {
      background: transparent !important;
      color: darker !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    a,
    a:visited {
      text-decoration: underline;
    }

    a[href]:after {
      content: " (" attr(href) ")";
    }

    abbr[title]:after {
      content: " (" attr(title) ")";
    }

    a[href^="#"]:after,
    a[href^="javascript:"]:after {
      content: "";
    }

    pre,
    blockquote {
      border: 1px solid layout-border;
      page-break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }

    tr,
    img {
      page-break-inside: avoid;
    }

    img {
      max-width: 100% !important;
    }

    p,
    h2,
    h3 {
      orphans: 3;
      widows: 3;
    }

    h2,
    h3 {
      page-break-after: avoid;
    }
  }

  pre,
  code {
    font-family: Menlo, Monaco, "Courier New", monospace;
  }

  pre {
    padding: 0.5rem;
    line-height: 1.25;
    overflow-x: scroll;
  }

  a,
  a:visited {
    color: link;
  }

  a:hover,
  a:focus,
  a:active {
    text-decoration: none;
  }

  .modest-no-decoration {
    text-decoration: none;
  }

  line-height: 1.85;
  padding-top: 20;
  padding-bottom: 20;

  p {
    font-size: 1rem;
    margin-bottom: 1.3rem;
  }

  h1,
  h2,
  h3,
  h4 {
    margin: 1.414rem 0 0.5rem;
    font-weight: inherit;
    line-height: 1.42;
  }

  h1 {
    margin-top: 0;
    font-size: 4rem;
  }

  h2 {
    font-size: 2.5rem;
  }

  h3 {
    font-size: 2rem;
  }

  h4 {
    font-size: 1.5rem;
  }

  h5 {
    font-size: 1.2rem;
  }

  h6 {
    font-size: 0.85rem;
  }

  small {
    font-size: 0.75em;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: default;
  }

  h1,
  h2,
  h3 {
    border-bottom: 1px solid;
    border-color: layout-border;
    margin-bottom: 1.15rem;
    padding-bottom: 0.5rem;
  }

  blockquote {
    border-left: 8px solid;
    border-color: layout-border;
    padding: 1rem;
  }

  pre,
  code {
    background-color: layout-border;
  }
`;

export const StaticPage: React.FC<{
  children: React.ReactNode;
  title: string;
}> = ({ children, title }) => {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Wrapper>
        <Container>{children}</Container>
      </Wrapper>
    </>
  );
};
