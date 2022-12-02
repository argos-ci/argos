/* eslint-disable react/no-unescaped-entities */
import Image from "next/future/image";
import { x } from "@xstyled/styled-components";
import {
  SparklesIcon,
  EyeIcon,
  Square3Stack3DIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import {
  CameraIcon,
  ArrowUpOnSquareStackIcon,
  CheckCircleIcon,
  BellAlertIcon,
  GlobeAltIcon,
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
        py={20}
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
            <x.h1 text={{ _: "h1-sm", sm: "h1" }}>
              Argos is the better way to
              <br />
              ship pixel perfect apps
            </x.h1>
            <x.p text={{ _: "teaser-sm", sm: "teaser" }}>
              Meet the new standard for modern visual testing.
              <br />
              Review visual changes in your development workflow.
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

          <x.div flex={1} mt={{ _: 6, sm: 10 }}>
            <Image
              src={argosBuildExample}
              alt="build example"
              style={{
                maxWidth: "100%",
                height: "auto",
                border: "4px solid black",
                borderRadius: 4,
                boxShadow: "0 -10px 100px 20px rgba(201, 136, 248, 0.2)",
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
        <x.h2 text="h2">Visual testing powered by CI</x.h2>
        <x.p text="teaser" mb={2}>
          Compare your pull requests screenshots with baseline to secure your
          delivery. Designed to fit seamlessly in your development routine.
        </x.p>
        <FeatureList>
          <Feature>
            <FeatureIcon icon={CameraIcon} color="primary" />
            <FeatureTitle>Take screenshots</FeatureTitle>
            <FeatureText>Use your favorite testing framework.</FeatureText>
          </Feature>

          <Feature>
            <FeatureIcon icon={ArrowUpOnSquareStackIcon} color="orange" />
            <FeatureTitle>Upload screenshots</FeatureTitle>
            <FeatureText>Add one command to configure your CI.</FeatureText>
          </Feature>
          <Feature>
            <FeatureIcon icon={BellAlertIcon} color="sky" />
            <FeatureTitle>Be notified</FeatureTitle>
            <FeatureText>
              Get a status check on Github pull-request.
            </FeatureText>
          </Feature>
          <Feature>
            <FeatureIcon icon={CheckCircleIcon} color="green" />
            <FeatureTitle>Review changes</FeatureTitle>
            <FeatureText>
              Compare screenshots in Argos side-by-side UI.
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
          <Chip icon={Square3Stack3DIcon}>Easy installation</Chip>
          <x.h2 text="h2">Compatible with every stack</x.h2>
          <x.p text="teaser">
            Argos offers integrations (SDK) for the most famous frameworks,
            testing libraries, and CI providers. As long as you can take
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
          <Chip icon={GlobeAltIcon}>Universal testing</Chip>
          <x.h2 text="h2">Review whole pages and individual components</x.h2>
          <x.p text="teaser">
            Use Argos to secure whole pages and individual components from
            regressions on several resolutions and browsers. Use a single tool
            for visual testing.
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
            textTransform="uppercase"
          >
            Trusted by the best front-end teams
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
              Join us on Discord
            </Button>
          </Link>
        </x.section>
      </Container>
    </x.div>
  );
}
