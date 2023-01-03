/* eslint-disable react/no-unescaped-entities */
import Image from "next/image";
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

export default function Home() {
  return (
    <div className="flex flex-col gap-[176px] md:gap-[240px]">
      <RotateBackground className="bg-gradient-to-b from-black to-blue-800/30 py-20">
        <Container className="flex gap-11 items-center flex-col mb-20 text-center">
          <div className="flex flex-col gap-6 flex-1">
            <Chip icon={SparklesIcon} clickable asChild className="mx-auto">
              <a href="https://argos-ci.com/docs/puppeteer">
                <span className="font-semibold">New · </span>
                Puppeteer support
              </a>
            </Chip>
            <h1 className="text-4xl sm:leading-tight sm:text-6xl font-bold">
              Ship pixel perfect apps
              <br />
              with no bug.
            </h1>
            <p className="text-on-light text-xl">
              Meet the new standard for modern visual testing.
              <br />
              Review visual changes in your development workflow.
            </p>
            <div className="flex gap-4 sm:gap-6 mt-6 mx-auto">
              <Button>
                {(buttonProps) => (
                  <a
                    {...buttonProps}
                    href="https://app.argos-ci.com/argos-ci/argos-ci.com/builds/20"
                  >
                    View a demo build
                  </a>
                )}
              </Button>
              <Button color="neutral" variant="outline">
                {(buttonProps) => (
                  <a {...buttonProps} href="/docs">
                    Documentation
                  </a>
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 mt-6 sm:mt-10">
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
          </div>
        </Container>
      </RotateBackground>

      <Container className="flex flex-col gap-6 items-center text-center">
        <Chip icon={EyeIcon}>What is Argos?</Chip>
        <h2 className="text-3xl font-semibold">Visual testing powered by CI</h2>
        <p className="text-xl text-on-light mb-10">
          Compare your pull requests screenshots with baseline to secure your
          delivery. Designed to fit seamlessly in your development routine.
        </p>
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

      <Container className="flex flex-col md:flex-row gap-16 items-center">
        <div className="flex-1 flex justify-center">
          <Image
            src={integrationImage}
            alt="Argos Integrations"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
        <div className="flex flex-col gap-6 flex-1">
          <Chip icon={Square3Stack3DIcon}>Easy integration</Chip>
          <h2 className="text-3xl font-semibold">Compatible with your stack</h2>
          <p className="text-on-light text-xl">
            Argos offers integrations (SDK) for the most famous frameworks,
            testing libraries, and CI providers. As long as you can take
            screenshots, you can use Argos.
          </p>
        </div>
      </Container>

      <Container className="flex flex-col md:flex-row gap-20 items-center">
        <div className="flex-1 flex md:hidden justify-center w-full">
          <Image
            src={unifiedMobileImage}
            alt="Unified platform"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <Chip icon={GlobeAltIcon}>Universal testing</Chip>
          <h2 className="text-3xl font-semibold">
            Review websites, apps and components together
          </h2>
          <p className="text-on-light text-xl">
            Use Argos to secure whole pages and individual components from
            regressions on several resolutions and browsers. Use a single tool
            for visual testing.
          </p>
        </div>

        <div className="flex-1 hidden md:block">
          <Image
            src={unifiedDesktopImage}
            alt="Unified platform"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
      </Container>

      <RotateBackground className="bg-gradient-to-b from-fuchsia-800/30 to-blue-800/30 pt-[120px] pb-[150px]">
        <Container className="flex flex-col items-center gap-8 mb-8 text-center">
          <div className="text-3xl font-medium">
            "Argos helps us every day to avoid regression on all MUI
            components."
          </div>
          <div className="rounded-full overflow-hidden">
            <Image
              src={tassinariProfile}
              alt="Olivier Tassinari"
              height={80}
              width={80}
            />
          </div>
          <div className="font-semibold">
            Olivier Tassinari
            <br />
            Co-founder & CEO of MUI
          </div>
          <hr className="border-b border-b-primary-800 w-full" />
          <div className="font-semibold text-sm tracking-widest uppercase">
            Trusted by the best front-end teams
          </div>
        </Container>
        <Testimonials>
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
        <section className="flex flex-col items-center gap-6 text-center mb-48">
          <Chip icon={HeartIcon}>Open source</Chip>
          <h2 className="text-3xl font-semibold">Join the community</h2>
          <p className="text-on-light text-xl">
            Argos is open source and community driven. Supported by a network of
            early advocates, contributors, and champions.
          </p>
          <Button className="flex gap-1 w-fit">
            {(buttonProps) => (
              <a {...buttonProps} href="https://discord.gg/FNGFpJS9">
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Join us on Discord
              </a>
            )}
          </Button>
        </section>
      </Container>
    </div>
  );
}
