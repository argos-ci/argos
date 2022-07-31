import { x } from "@xstyled/styled-components";
import {
  IoBalloonOutline,
  IoBugOutline,
  IoCheckmarkDoneOutline,
  IoShieldOutline,
} from "react-icons/io5";
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

export default function Home() {
  return (
    <>
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
    </>
  );
}
