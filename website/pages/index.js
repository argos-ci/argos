import { useEffect, useRef, useState } from 'react'
import { x } from '@xstyled/styled-components'
import {
  IoArrowForward,
  IoBug,
  IoLogoGithub,
  IoBeerOutline,
  IoConstructOutline,
} from 'react-icons/io5'
import Head from 'next/head'
import { HorizontalLogo } from 'components/HorizontalLogo'
import { Link } from 'components/Link'
import { Navbar, NavbarSecondary } from 'components/Navbar'
import {
  Section,
  SectionColoredTitle,
  SectionHeader,
  SectionIcon,
  SectionTitle,
} from 'components/Sections'
import { PageContainer } from 'components/PageContainer'
import { Button } from 'components/Button'
import { Subtitle, Title } from 'components/Titles'
import { Paragraph } from 'components/Paragraph'
import { GithubClickableStatus } from '@components/animation/GithubStatus'
import { Animation } from 'components/animation'
import { useWindowSize } from '@hooks/useWindowSize'
import { GradientText } from '@components/GradientText'
import { Brands, BrandsTitle } from '@components/Brands'
import {
  CodeEditor,
  CodeEditorBody,
  CodeEditorHeader,
  CodeEditorTab,
} from '@components/CodeEditor'
import { Versus } from '@components/Versus'
import { ResizableArgosScreenshots } from '@components/ResizableArgosScreenshots'

export default function Home() {
  const [animationScale, setAnimationScale] = useState()
  const animationContainerRef = useRef()
  const { width: windowWidth } = useWindowSize()
  const animationDimensions = { width: 600, height: 410 }

  useEffect(() => {
    setAnimationScale(
      Math.min(
        1,
        animationContainerRef.current.clientWidth / animationDimensions.width,
      ),
    )
  }, [animationDimensions.width, windowWidth])

  return (
    <x.div>
      <Head>
        <title>Argos CI</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <Navbar>
        <x.div as={HorizontalLogo} mt={1} ml={-2} />
        <NavbarSecondary>
          <Link href="http://www.google.fr">
            Login
            <x.div as={IoLogoGithub} />
          </Link>
          <Button>Try now</Button>
        </NavbarSecondary>
      </Navbar>

      <Section
        backgroundImage="gradient-to-t"
        gradientTo="body-background"
        gradientFrom="blue-gray-900"
      >
        <PageContainer
          display="flex"
          flexDirection={{ _: 'column-reverse', lg: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          <x.div
            flex={{ _: 1, lg: 1 / 2 }}
            textAlign={{ _: 'center', lg: 'left' }}
            alignItems={{ _: 'center', lg: 'flex-start' }}
            display="flex"
            flexDirection="column"
            gap={5}
          >
            <Title>
              Screenshot Testing
              <GradientText as="div">catch visual bugs</GradientText>
            </Title>
            <Subtitle maxW={500}>
              Argos CI adds screenshot review to developer’s routine.{' '}
              <x.span color="secondary">
                Compare pull-requests screenshots and be notify when{' '}
                <x.span color="gray-200" top="-2px" position="relative">
                  something*{' '}
                </x.span>
                changes.
              </x.span>
            </Subtitle>
            <x.div display="flex" gap={10} alignItems="center">
              <Button>
                Try now <x.div as={IoArrowForward} />
              </Button>
            </x.div>
          </x.div>

          <x.div
            display="flex"
            ref={animationContainerRef}
            minH={animationDimensions.height * animationScale}
            justifyContent="center"
            alignItems="flex-start"
            overflow="hidden"
            flex={{ lg: 1 / 2 }}
            w={1}
          >
            {animationScale ? (
              <Animation
                transform
                transformOrigin="top"
                scale={animationScale}
              />
            ) : null}
          </x.div>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon pt="6px" pl="8px">
              🦋
            </SectionIcon>
            <SectionColoredTitle>Automatic test coverage</SectionColoredTitle>
            <SectionTitle>Set the trap and catch the bugs</SectionTitle>
          </SectionHeader>
          <Paragraph>
            Add screenshots in your integrations tests to prevent future visuals
            bugs. On each commit, screenshots differences are detected and
            notified via GitHub check status.
          </Paragraph>
          <Paragraph>Approve updates in one-click.</Paragraph>
          <GithubClickableStatus mt={8} />
        </PageContainer>
      </Section>

      <Section backgroundColor="background-secondary">
        <PageContainer>
          <BrandsTitle mt={10}>
            <GradientText>+ 10 000 000</GradientText>
            <x.div fontSize="60%">screenshots / month</x.div>
          </BrandsTitle>
          <Brands />
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon pb="7px">🫂</SectionIcon>
            <SectionColoredTitle>Prevent visual regression</SectionColoredTitle>
            <SectionTitle>Developer Friendly</SectionTitle>
          </SectionHeader>

          <Paragraph>
            Argos fits perfectly in your development workflow. Replace complex
            end-to-end tests by a single-line screenshot test.
          </Paragraph>
          <Paragraph>Easy to code, free to maintain.</Paragraph>

          <x.div
            display="flex"
            gap={4}
            justifyContent="space-between"
            alignItems={{ _: 'center', md: 'flex-start' }}
            flexDirection={{ _: 'column', md: 'row' }}
            mt={8}
          >
            <CodeEditor flex={{ _: 'column', md: 1 }} w={1} h="auto">
              <CodeEditorHeader>
                <CodeEditorTab active="true">
                  details-page.test.js
                </CodeEditorTab>
              </CodeEditorHeader>
              <CodeEditorBody h="370px">
                {`it('should list car details', () => {
  cy.get('h1')
    .contains('Lamborghini Aventador')

  cy.get('div.color')
    .contains('Verde Mantis')

  cy.get('div.priceTag')
    .contains('$$$')
    
  cy.get('div.seller-name')
    .contains('Georges Abitbol')
  ...
})
`}
              </CodeEditorBody>
            </CodeEditor>
            <x.div as={Versus} w="100px" my="20px" color="white" />
            <CodeEditor flex={{ _: 'auto', md: 1 }} w={1} h="160px">
              <CodeEditorHeader>
                <CodeEditorTab active="true">
                  details-page.test.js
                </CodeEditorTab>
              </CodeEditorHeader>
              <CodeEditorBody>{`it('should list car details', () => {
  cy.argosScreenshot('details_page')
})
`}</CodeEditorBody>
            </CodeEditor>
          </x.div>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon fontSize="40px" pb="2px">
              📸
            </SectionIcon>
            <SectionColoredTitle>Universal</SectionColoredTitle>
            <SectionTitle>Screenshot everything</SectionTitle>
          </SectionHeader>

          <Paragraph>
            Cover complete pages or individual components. No matter the
            language, framework, browser or resolution, with Argos CI ensures
            you have no regression.
          </Paragraph>

          <ResizableArgosScreenshots />
        </PageContainer>
      </Section>
    </x.div>
  )
}
