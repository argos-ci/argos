import styled, { x } from "@xstyled/styled-components";
import Head from "next/head";
import { PageContainer } from "@components/PageContainer";
import { MDXProvider } from "@mdx-js/react";
import { Image } from "@components/Image";
import { Code } from "@components/Code";
import { InlineCode } from "./InlineCode";

const components = {
  img: Image,
  h1: (props) => <x.h1 text="4xl" fontWeight="bold" mt={2} {...props} />,
  h2: (props) => <x.h2 text="2xl" fontWeight="bold" mt={8} {...props} />,
  h3: (props) => <x.h3 text="xl" fontWeight="semibold" my={5} {...props} />,
  p: (props) => (
    <x.p text="md" lineHeight="snug" color="secondary" my={4} {...props} />
  ),
  ul: (props) => (
    <x.ul
      text="md"
      lineHeight="snug"
      my={4}
      pl={10}
      listStyleType="disc"
      color="secondary"
      {...props}
    />
  ),

  li: (props) => <x.li my={3} {...props} />,
  code: Code,
  inlineCode: InlineCode,
};

const MarkdownStyle = styled.div`
  a {
    color: primary-400;
    text-decoration: none;

    &:hover {
      color: primary-100;
    }
  }
`;

export default function MarkdownPage({ title, children }) {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <MDXProvider components={components}>
        <MarkdownStyle>
          <PageContainer pt={16}>{children}</PageContainer>
        </MarkdownStyle>
      </MDXProvider>
    </>
  );
}
