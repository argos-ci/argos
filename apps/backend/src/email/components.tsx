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

export function Paragraph(props: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Text className="my-4 text-sm leading-relaxed text-gray-950" {...props} />
  );
}

export function Hi(props: { name: string | null }) {
  return (
    <Paragraph>
      Hi
      {props.name ? (
        <>
          {" "}
          <strong>{props.name}</strong>,
        </>
      ) : (
        ","
      )}
    </Paragraph>
  );
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
      className="my-6 border-0 border-t border-solid border-gray-200"
      {...props}
    />
  );
}

export function Link(props: LinkProps) {
  return <RELink className="text-[#5746af] underline" {...props} />;
}

export function HighlightBlock(props: { children: React.ReactNode }) {
  return (
    <Text className="bg-[#f6f6f6] p-4 text-center text-base font-bold">
      {props.children}
    </Text>
  );
}

export function InfoText(props: { children: React.ReactNode }) {
  return <Text className="my-4 text-xs text-gray-700">{props.children}</Text>;
}

export function SafetyInfo() {
  return (
    <InfoText>
      If you are concerned about your account's safety, please{" "}
      <Link href="https://argos-ci.com/docs/contact-us">contact us</Link> to get
      in touch with us.
    </InfoText>
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
  /**
   * Whether to show the footer.
   * @default true
   */
  footer?: boolean;
}) {
  const { footer = true, children, centered, preview } = props;
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="m-auto bg-white font-sans">
          <Container className="mx-auto my-10 rounded-sm border border-solid border-gray-200 p-5">
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
                className={clsx("my-0", centered && "mx-auto")}
              />
            </Section>
            {children}
            {footer && (
              <>
                <Hr />
                <Link
                  className="text-sm font-bold text-gray-500"
                  href="https://argos-ci.com"
                >
                  Argos
                </Link>
              </>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
