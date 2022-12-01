/* eslint-disable react/no-unescaped-entities */
import Image from "next/future/image";
import { x } from "@xstyled/styled-components";
import {
  SparklesIcon,
  EyeIcon,
  Square3Stack3DIcon,
  RocketLaunchIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import {
  CameraIcon,
  ArrowUpOnSquareStackIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import argosBuildExample from "@/images/argos-build-example.png";
import {
  FeatureList,
  Feature,
  FeatureIcon,
  FeatureTitle,
  FeatureText,
} from "@/components/Feature";
import integrationImage from "@/images/integration.svg";
import unifiedDesktopImage from "@/images/unified-desktop.svg";
import unifiedMobileImage from "@/images/unified-mobile.svg";
import tassinariProfile from "@/images/tassinari-profile.jpg";
import antDesign from "@/images/brands/ant-design.svg";
import doctolib from "@/images/brands/doctolib.svg";
import gitbook from "@/images/brands/gitbook.svg";
import lemonde from "@/images/brands/lemonde.svg";
import mui from "@/images/brands/mui.svg";
import { Testimonials } from "@/components/Testimonials";
import { Container } from "@/components/Container";
import { RotateBackground } from "@/components/RotateBackground";
import Link from "next/link";

export default function Home() {
  return (
    <x.div display="flex" flexDirection="column" gap={{ _: 176, md: 240 }}>
      <RotateBackground
        backgroundImage="gradient-to-b"
        gradientFrom="lighter"
        gradientTo="hero-bg"
        pt={10}
        pb={20}
      >
        <Container
          display="flex"
          gap={11}
          alignItems="center"
          flexDirection="column"
          mb={20}
          textAlign="center"
        >
          <x.div display="flex" flexDirection="column" gap={6} flex={1}>
            <Link href="https://docs.argos-ci.com/puppeteer" passHref>
              <Chip icon={SparklesIcon} clickable as="a" margin="auto">
                <x.span fontWeight="500">New · </x.span>
                Puppeteer support
              </Chip>
            </Link>
            <x.h1 text="h1">
              Argos is the better way to
              <br />
              ship pixel perfect apps
            </x.h1>
            <x.p text="teaser">
              Meet the new standard for modern visual testing.
              <br />
              Compare pull request screenshots side-by-side with baseline.
            </x.p>
            <x.div display="flex" gap={{ _: 4, sm: 6 }} mt={6} mx="auto">
              <Button
                as="a"
                href="https://app.argos-ci.com/argos-ci/www.argos-ci.com/builds/66"
              >
                View a demo build
              </Button>
              <Link href="https://docs.argos-ci.com" passHref>
                <Button color="secondary" variant="outline">
                  Documentation
                </Button>
              </Link>
            </x.div>
          </x.div>

          <x.div flex={1} display={{ _: "none", md: "block" }} mt={10}>
            <Image
              src={argosBuildExample}
              alt="build example"
              style={{
                maxWidth: "100%",
                height: "auto",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
              }}
            />
          </x.div>
        </Container>
      </RotateBackground>

      <Container
        as="section"
        display="flex"
        flexDirection="column"
        gap={6}
        alignItems="center"
        textAlign="center"
      >
        <Chip icon={EyeIcon}>What is Argos?</Chip>
        <x.h2 text="h2">Get instant value from a simple screenshot</x.h2>
        <x.p text="teaser">
          Take screenshots, upload them and get instant value by being notified
          of changes.
        </x.p>
        <FeatureList>
          <Feature>
            <FeatureIcon icon={CameraIcon} color="primary" />
            <FeatureTitle>Take screenshots</FeatureTitle>
            <FeatureText>
              Use one of Argos’ many integrations to take screenshots or do it
              yourself.
            </FeatureText>
          </Feature>
          <Feature>
            <FeatureIcon icon={ArrowUpOnSquareStackIcon} color="orange" />
            <FeatureTitle>Upload screenshots</FeatureTitle>
            <FeatureText>
              Add one command in your CI to upload screenshots to Argos.
            </FeatureText>
          </Feature>
          <Feature>
            <FeatureIcon icon={CheckCircleIcon} color="green" />
            <FeatureTitle>Review changes</FeatureTitle>
            <FeatureText>
              Get status on your pull-requests and use Argos to review and
              approve changes.
            </FeatureText>
          </Feature>
        </FeatureList>
      </Container>

      <Container
        as="section"
        display="flex"
        flexDirection={{ _: "column", md: "row" }}
        alignItems="center"
        gap={16}
      >
        <x.div flex={1} display="flex" justifyContent="center">
          <Image
            src={integrationImage}
            alt="Argos Integrations"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </x.div>
        <x.div display="flex" flexDirection="column" gap={6} flex={1}>
          <Chip icon={Square3Stack3DIcon}>Easy integration</Chip>
          <x.h2 text="h2">Compatible with your stack</x.h2>
          <x.p text="teaser">
            Argos offers SDK for most frameworks, testing libraries and CI
            providers. This is not mandatory, as long as you can take
            screenshots, you can use Argos.
          </x.p>
        </x.div>
      </Container>

      <Container
        as="section"
        display="flex"
        flexDirection={{ _: "column", md: "row" }}
        gap={20}
        alignItems="center"
      >
        <x.div
          flex={1}
          display={{ _: "flex", md: "none" }}
          justifyContent="center"
          w={1}
        >
          <Image
            src={unifiedMobileImage}
            alt="Unified platform"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </x.div>

        <x.div flex={1} display="flex" flexDirection="column" gap={6}>
          <Chip icon={RocketLaunchIcon}>Unified platform</Chip>
          <x.h2 text="h2">Review websites, apps and components together</x.h2>
          <x.p text="teaser">
            Argos has no limit. Whether it's a single component or a website in
            multiple resolutions, everything is possible. Use a single tool for
            Visual Testing.
          </x.p>
        </x.div>

        <x.div flex={1} display={{ _: "none", md: "block" }}>
          <Image
            src={unifiedDesktopImage}
            alt="Unified platform"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </x.div>
      </Container>

      <RotateBackground
        as="section"
        backgroundImage="gradient-to-b"
        gradientFrom="testimonials-bg-top"
        gradientTo="testimonials-bg-bottom"
        pt={120}
        pb={150}
      >
        <Container
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={8}
          textAlign="center"
          mb={8}
        >
          <x.div text="quote">
            "Argos helps us every day to avoid regression on all MUI
            components."
          </x.div>
          <x.div borderRadius="full" overflow="hidden">
            <Image
              src={tassinariProfile}
              alt="Olivier Tassinari"
              height={80}
              width={80}
            />
          </x.div>
          <x.div lineHeight={1.5} fontWeight="semibold">
            Olivier Tassinari
            <br />
            Co-founder & CEO of MUI
          </x.div>
          <x.hr borderBottom={1} borderColor="primary-border" w={1} />
          <x.div
            color="on"
            fontWeight="medium"
            fontSize="sm"
            lineHeight={1.4}
            letterSpacing="widest"
          >
            TRUSTED BY THE BEST FRONT-END TEAMS
          </x.div>
        </Container>
        <Testimonials gap={10}>
          <Image
            className="testimonial"
            priority={true}
            src={antDesign}
            alt="Ant Design"
          />
          <Image
            className="testimonial"
            priority={true}
            src={mui}
            alt="MUI"
            style={{ marginTop: -5 }}
          />
          <Image
            className="testimonial"
            priority={true}
            src={doctolib}
            alt="Doctolib"
          />
          <Image
            className="testimonial"
            priority={true}
            src={lemonde}
            alt="Le Monde"
          />
          <Image
            className="testimonial"
            priority={true}
            src={gitbook}
            alt="GitBook"
          />
        </Testimonials>
      </RotateBackground>

      <Container>
        <x.section
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={6}
          textAlign="center"
          mb={200}
        >
          <Chip icon={HeartIcon}>Open source</Chip>
          <x.h2 text="h2">Join the community</x.h2>
          <x.p text="teaser">
            Argos is open source and community driven. Supported by a network of
            early advocates, contributors, and champions.
          </x.p>
          <Link href="https://discord.gg/FNGFpJS9" passHref>
            <Button display="flex" gap={1} w="fit-content" as="a">
              <x.svg as={ChatBubbleLeftRightIcon} w={4} />
              Chat about Argos on Discord
            </Button>
          </Link>
        </x.section>
      </Container>
    </x.div>
  );
}
