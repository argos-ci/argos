import { x } from "@xstyled/styled-components";
import {
  IoBalloonOutline,
  IoBugOutline,
  IoCheckmarkDoneOutline,
  IoShieldOutline,
} from "react-icons/io5";
import Head from "next/head";
import { AppNavbar } from "components/Navbar";
import {
  Section,
  SectionColoredTitle,
  SectionHeader,
  SectionIcon,
  SectionTitle,
} from "components/Sections";
import { PageContainer } from "components/PageContainer";
import { Paragraph } from "components/Paragraph";
import { Brands } from "@components/Brands";
import { ResizableArgosScreenshots } from "@components/home-illustrations/ResizableArgosScreenshots";
import { CompareTestCode } from "@components/home-illustrations/CompareTestCode";
import { AboveTheFold } from "@components/AboveTheFold";
import { GithubClickableStatus } from "@components/home-illustrations/GithubClickableStatus";
import { AppFooter } from "@components/Footer";

export default function Home() {
  return (
    <>
      <Head>
        <title>Argos - Automate visual testing in your CI</title>
        <meta
          name="description"
          content="Argos is a visual testing solution that fits in your workflow to avoid visual regression."
        />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
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
            <SectionTitle>Automate testing</SectionTitle>
            <SectionColoredTitle>Catch bugs earlier</SectionColoredTitle>
          </SectionHeader>
          <Paragraph>
            No more manual testing, Argos does the job for you. <br />
            On each commit, visual diffs are detected and notified on GitHub.
            Accepts or rejects changes in one click.
          </Paragraph>
          <GithubClickableStatus mt={8} maxW="3xl" />
        </PageContainer>
      </Section>

      <Section bg="background-secondary" textAlign="center">
        <x.div
          mt={10}
          text={{ _: "5xl", md: "6xl" }}
          fontWeight="500"
          whiteSpace="nowrap"
        >
          + 10 000 000
        </x.div>
        <x.div text="2xl">screenshots / month</x.div>
        <PageContainer mt={10}>
          <Brands />
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={IoBalloonOutline} p={3} />
            <SectionTitle>Developer Friendly</SectionTitle>
            <SectionColoredTitle>Save time, test more</SectionColoredTitle>
          </SectionHeader>
          <Paragraph>
            Argos integrates perfectly in your dev workflow. Replace complex
            end-to-end test by a single-line screenshot test. Easy to code, free
            to maintain.
          </Paragraph>
          <CompareTestCode />
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeader>
            <SectionIcon icon={IoCheckmarkDoneOutline} p={3} />
            <SectionTitle>Universal</SectionTitle>
            <SectionColoredTitle>Screenshot everything</SectionColoredTitle>
          </SectionHeader>
          <Paragraph>
            Cover complete pages or individual components. No matter the
            library, the framework, the browser or the resolution, Argos ensures
            you have no regression.
          </Paragraph>
          <ResizableArgosScreenshots mt={8} />
        </PageContainer>
      </Section>

      <AppFooter />
    </>
  );
}
