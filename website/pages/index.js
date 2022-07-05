import { x } from '@xstyled/styled-components'
import {
  IoArrowForward,
  IoCameraReverseOutline,
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
import { Image } from 'components/Image'
import { Paragraph } from 'components/Paragraph'
import { MuiLogo } from 'components/MuiLogo'
import { MobileSlider } from 'components/Slider'
import leMondeLogo from 'img/lemonde-logo.png'
import doctolibLogo from 'img/doctolib-logo.png'
import { Animation } from '../components/Animation'

export default function Home() {
  return (
    <>
      <Head>
        <title>Argos CI</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <Navbar>
        <x.div as={HorizontalLogo} mt={1} ml={-2} />
        <NavbarSecondary>
          <Link
            href="http://www.google.fr"
            display="flex"
            alignItems="center"
            gap={1}
          >
            Login
            <x.div as={IoLogoGithub} />
          </Link>
          <Button>Try now</Button>
        </NavbarSecondary>
      </Navbar>

      <Section
        py={0}
        backgroundImage="gradient-to-b"
        gradientFrom="black"
        gradientTo="primary-a10"
      >
        <PageContainer
          display="flex"
          flexDirection={{ _: 'column', md: 'row' }}
          alignItems="center"
          gap={6}
        >
          <x.div
            display="flex"
            flexDirection={'column'}
            flex={{ _: 1, md: 2 / 5 }}
            gap={10}
            mt={10}
            mb={14}
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
              <Link
                href="http://www.google.fr"
                display="flex"
                alignItems="center"
                gap={1}
              >
                Start Learn
                <x.div as={IoArrowForward} />
              </Link>
              <Button>
                Try now <x.div as={IoArrowForward} />
              </Button>
            </x.div>
          </x.div>

          <x.div flex={{ _: 1, md: 3 / 5 }} h={480}>
            <Animation w={1} mt={10} />
          </x.div>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={IoCameraReverseOutline} />
            <SectionColoredTitle>Automate testing</SectionColoredTitle>
            <SectionTitle>Catch bugs earlier.</SectionTitle>
          </SectionHeader>

          <Paragraph>
            No more manual testing; Argos CI does the job for you.
          </Paragraph>
          <Paragraph>
            On each commit, screenshots diffs are detected and notified on
            GitHub. Accepts or rejects changes in one click.
          </Paragraph>

          <Paragraph color="red">TODO : Animation des github status</Paragraph>
        </PageContainer>
      </Section>

      <Section
        backgroundImage="gradient-to-b"
        gradientFrom="transparent"
        gradientVia="indigo-900"
        gradientTo="transparent"
        py={20}
      >
        <PageContainer>
          <x.div
            fontSize="xl"
            mb={8}
            mx="auto"
            textAlign="center"
            color="white"
          >
            <x.div color="primary" fontSize={{ _: '3xl', md: '6xl' }} mb={3}>
              + 10 millions
            </x.div>
            screenshots / month
          </x.div>

          <MobileSlider>
            <x.div display="flex" gap={4} alignItems="center">
              <x.div as={MuiLogo} h="50px" w="60px" />
              <x.div fontSize="6xl">MUI</x.div>
            </x.div>
            <Image src={doctolibLogo} alt="Logo Doctolib" w={200} />
            <Image src={leMondeLogo} alt="Logo Le Monde" w={200} />
          </MobileSlider>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={IoBeerOutline} />
            <SectionColoredTitle>Developer Friendly</SectionColoredTitle>
            <SectionTitle>Save time, test more.</SectionTitle>
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
    </>
  )
}
