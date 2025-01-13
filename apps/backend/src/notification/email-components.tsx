import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  LinkProps,
  Preview,
  Hr as REHr,
  Link as RELink,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import clsx from "clsx";

import config from "@/config";

import { HandlerContext } from "./handlers";

export function Paragraph(props: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <Text className="my-4 text-sm text-gray-950" {...props} />;
}

export function H1(props: { children: React.ReactNode }) {
  return (
    <Heading className="mb-5 mt-3 p-0 text-xl font-medium">
      {props.children}
    </Heading>
  );
}

export function H2(props: { children: React.ReactNode }) {
  return (
    <Heading as="h2" className="mb-3 p-0 text-base font-bold" {...props} />
  );
}

export function Hr(props: Record<string, never>) {
  return (
    <REHr
      className="border-0 border-t border-solid border-gray-200"
      {...props}
    />
  );
}

export function Link(props: LinkProps) {
  return <RELink className="text-[#5746af] underline" {...props} />;
}

export function Hi(props: { ctx: HandlerContext }) {
  return (
    <Paragraph>
      Hi{props.ctx.user.name ? ` ${props.ctx.user.name},` : ","}
    </Paragraph>
  );
}

export function Signature() {
  return (
    <Paragraph>
      Best,
      <br />
      The Argos Team
    </Paragraph>
  );
}

export function EmailLayout(props: {
  children: React.ReactNode;
  centered?: boolean;
  preview: string;
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{props.preview}</Preview>
      <Tailwind>
        <Body className="m-auto bg-white font-sans">
          <Container className="mx-auto my-10 rounded border border-solid border-gray-200 p-5">
            <Section>
              <Img
                src={
                  new URL(
                    "/static/emails/argos-logo.png",
                    config.get("server.url"),
                  ).href
                }
                width="40"
                height="40"
                alt="Argos"
                className={clsx("my-0", props.centered && "mx-auto")}
              />
            </Section>
            {props.children}
            <Hr />
            <Link
              className="text-sm font-bold text-gray-500"
              href="https://argos-ci.com"
            >
              Argos
            </Link>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
