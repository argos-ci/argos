import { useEffect, useRef, useState } from 'react'
import { x } from '@xstyled/styled-components'
import { IoEyeOutline, IoLogoGithub } from 'react-icons/io5'
import { GiFeather, GiWolfTrap } from 'react-icons/gi'
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
import { ResizableArgosScreenshots } from '@components/ResizableArgosScreenshots'
import { CompareTestCode } from '@components/CompareTestCode'

const MainTitle = (props) => (
  <x.div
    flex={{ _: 1, lg: 1 / 2 }}
    alignItems={{ _: 'flex-start', sm: 'center', lg: 'flex-start' }}
    maxW={{ sm: '500px' }}
    display="flex"
    flexDirection="column"
    gap={8}
  >
    <Title {...props}>
      Screenshot Testing
      <GradientText as="div">catch visual bugs</GradientText>
    </Title>
    <Subtitle>
      Adds screenshot review to your developer team’s routine.{' '}
      <x.span color="secondary">
        Compare pull-requests screenshots and be notified when{' '}
        <x.span color="gray-200" top="-2px" position="relative">
          something*{' '}
        </x.span>
        changes.
      </x.span>
    </Subtitle>
    <Button
      w={{ _: 1, sm: 200, lg: 'auto' }}
      px={6}
      h={12}
      fontWeight="semibold"
    >
      Get started
    </Button>
  </x.div>
)

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
          flexDirection={{ _: 'column', lg: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          columnGap={2}
          rowGap={20}
        >
          <MainTitle />
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
            <SectionIcon icon={GiWolfTrap} />
            <SectionColoredTitle>Automatic test coverage</SectionColoredTitle>
            <SectionTitle>Set the trap and catch the bugs.</SectionTitle>
          </SectionHeader>
          <Paragraph>
            Add screenshots in your integrations tests to prevent future visuals
            bugs. On each commit, screenshots differences are detected and
            notified via GitHub check status.
          </Paragraph>
          <Paragraph>
            Review updates and approve updates in one-click.
          </Paragraph>
          <GithubClickableStatus mt={8} maxW={650} />
        </PageContainer>
      </Section>

      <Section backgroundColor="background-secondary">
        <BrandsTitle mt={10}>
          <GradientText>+ 10 000 000</GradientText>
          <x.div fontSize="60%">screenshots / month</x.div>
        </BrandsTitle>
        <PageContainer>
          <Brands />
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={GiFeather} p={3} />
            <SectionColoredTitle>Lighter tests</SectionColoredTitle>
            <SectionTitle>Easy to test and no maintenance.</SectionTitle>
          </SectionHeader>
          <Paragraph>
            Replace heavy end-to-end tests with a single-line screenshot test.
            Prevent visual regression with a visually explicit review and avoid
            test maintenance cost.
          </Paragraph>
          <CompareTestCode />
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={IoEyeOutline} p={3} />
            <SectionColoredTitle>
              Powerful and techno agnostic
            </SectionColoredTitle>
            <SectionTitle>Ship features with serenity.</SectionTitle>
          </SectionHeader>
          <Paragraph>
            Every visual evolutions will be shown for approval. Secure desktop,
            mobile and any browser front-ends from visual bugs.{' '}
          </Paragraph>
          <Paragraph>
            Moreover, catch dependencies based regressions on-the-fly.
          </Paragraph>
          <Paragraph>
            No matters your techno if you can take screenshots, you can use
            Argos.
          </Paragraph>
          <ResizableArgosScreenshots mt={8} />
        </PageContainer>
      </Section>
    </x.div>
  )
}
