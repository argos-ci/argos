import { useEffect, useRef, useState } from 'react'
import { x } from '@xstyled/styled-components'
import {
  IoArrowForward,
  IoBug,
  IoLogoGithub,
  IoBeerOutline,
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
import { BrandsSlider } from 'components/Slider'
import { Animation } from 'components/animation'
import { useWindowSize } from '@hooks/useWindowSize'

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
          justifyContent="flex-start"
          alignItems="center"
          gap={10}
        >
          <x.div
            maxW={500}
            flex={{ _: 1, lg: 2 / 5 }}
            textAlign={{ _: 'center', lg: 'left' }}
            alignItems={{ _: 'center', lg: 'flex-start' }}
            display="flex"
            flexDirection="column"
            gap={10}
          >
            <Title>
              Screenshot Testing
              <x.div color="primary">catch visual bugs</x.div>
            </Title>
            <Subtitle>
              Argos CI adds screenshot updates review to developer’s routine.{' '}
              <x.span color="secondary">
                Compare pull-requests screenshots and notify when{' '}
                <x.span color="gray-200" top="-2px" position="relative">
                  something{' '}
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
            alignItems={{ _: 'flex-start', lg: 'center' }}
            justifyContent="center"
            w={1}
            flex={{ _: 1, lg: 3 / 5 }}
          >
            {animationScale ? (
              <Animation transform scale={animationScale} />
            ) : null}
          </x.div>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={IoBug} />
            <SectionColoredTitle>
              Prevent visual regression with automatic test coverage
            </SectionColoredTitle>
            <SectionTitle>Set the trap and catch the bugs</SectionTitle>
          </SectionHeader>
          <Paragraph>
            On each commit screenshots differences are detected and notified via
            GitHub check status. Approve updates in one-click.
          </Paragraph>

          <GithubClickableStatus mt={10} />
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <x.div
            fontSize={{ _: '4xl', md: '5xl' }}
            mb={8}
            mx="auto"
            textAlign="center"
            color="white"
            fontWeight="semibold"
          >
            + 10M screenshots <x.div fontSize="4xl">/ month</x.div>
          </x.div>

          <BrandsSlider />
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={IoBeerOutline} />
            <SectionColoredTitle>poulet...</SectionColoredTitle>
            <SectionTitle>Developer Friendly</SectionTitle>
          </SectionHeader>

          <Paragraph>
            Argos integrates perfectly in your dev workflow. Replace complex
            end-to-end test by a single-line screenshot test.
          </Paragraph>
          <Paragraph>Easy to code, free to maintain.</Paragraph>

          <Button>
            Get Started <x.div as={IoArrowForward} />
          </Button>

          <Paragraph color="red">
            TODO : Animation <br />
            Code avant / après VS Code + Test d’intégration vs screenshot Argos
          </Paragraph>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={IoBeerOutline} />
            <SectionColoredTitle>Universal</SectionColoredTitle>
            <SectionTitle>Screenshot everything</SectionTitle>
          </SectionHeader>

          <Paragraph>
            Cover complete pages or individual components. No matter the
            library, the framework, the browser or the resolution, Argos ensures
            you have no regression.
          </Paragraph>

          <Paragraph color="red">
            TODO : Animation <br />
            Frame 1 : Composant button de Storybook
            <br />
            Frame 2 : Composant button de Storybook avec plus grand padding +
            check Argos OK
            <br />
            Frame 3 : Fiche produit en desktop + check argos OK
            <br />
            Frame 4 : Fiche produit en mobile + bug UI
            <br />
            Frame 5 : Frame 4 + erreur en rouge + check Argos KO
          </Paragraph>
        </PageContainer>
      </Section>
    </x.div>
  )
}
