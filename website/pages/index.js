import { x } from '@xstyled/styled-components'
import {
  IoBalloonOutline,
  IoBugOutline,
  IoCheckmarkDoneOutline,
  IoShieldOutline,
} from 'react-icons/io5'
import Head from 'next/head'
import { AppNavbar } from 'components/Navbar'
import {
  Section,
  SectionColoredTitle,
  SectionHeader,
  SectionIcon,
  SectionTitle,
} from 'components/Sections'
import { PageContainer } from 'components/PageContainer'
import { Paragraph } from 'components/Paragraph'
import { GradientText } from '@components/GradientText'
import { Brands, BrandsTitle } from '@components/Brands'
import { ResizableArgosScreenshots } from '@components/home-illustrations/ResizableArgosScreenshots'
import { CompareTestCode } from '@components/home-illustrations/CompareTestCode'
import { AboveTheFold } from '@components/AboveTheFold'
import { GithubClickableStatus } from '@components/home-illustrations/GithubClickableStatus'
import { AppFooter } from '@components/Footer'

export default function Home() {
  return (
    <>
      <Head>
        <title>Argos CI</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <AppNavbar />

      <Section
        backgroundImage="gradient-to-t"
        gradientTo="body-background"
        gradientFrom="blue-gray-900"
      >
        <PageContainer>
          <AboveTheFold />
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon>
              <x.div as={IoShieldOutline} mt="4px" ml="2px" />
              <x.div as={IoBugOutline} position="absolute" w="20px" />
            </SectionIcon>
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
            <SectionIcon icon={IoBalloonOutline} p={3} />
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
            <SectionIcon icon={IoCheckmarkDoneOutline} p={3} />
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

      <AppFooter />
    </>
  )
}
