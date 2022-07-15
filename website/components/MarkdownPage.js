import { x } from '@xstyled/styled-components'
import Head from 'next/head'
import { AppNavbar } from 'components/Navbar'
import { PageContainer } from '@components/PageContainer'
import { MDXProvider } from '@mdx-js/react'
import { Image } from '@components/Image'
import { Code } from '@components/Code'
import { AppFooter } from './Footer'
import { InlineCode } from './InlineCode'

const components = {
  img: Image,
  h1: (props) => <x.h1 fontSize="3xl" fontWeight="bold" mt={2} {...props} />,
  h2: (props) => <x.h2 fontSize="2xl" fontWeight="bold" mt={8} {...props} />,
  h3: (props) => <x.h3 fontSize="xl" fontWeight="semibold" my={5} {...props} />,
  p: (props) => (
    <x.p fontSize="md" lineHeight="snug" color="secondary" my={4} {...props} />
  ),
  ul: (props) => (
    <x.ul
      fontSize="md"
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
}

const Markdown = ({ children, ...props }) => (
  <MDXProvider components={components} {...props}>
    {children}
  </MDXProvider>
)

export default function MarkdownPage({ title, children }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <AppNavbar />
      <Markdown>
        <PageContainer>{children}</PageContainer>
      </Markdown>
      <AppFooter />
    </>
  )
}
