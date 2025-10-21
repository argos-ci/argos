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
  Button as REButton,
  Hr as REHr,
  Link as RELink,
  Section,
  Tailwind,
  Text,
  type ButtonProps,
} from "@react-email/components";
import clsx from "clsx";
import { z } from "zod";

import config from "@/config";

import type { AvatarSchema, LocationSchema } from "./schemas";

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
    <Heading className="mt-3 mb-5 p-0 text-2xl font-medium">
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
    <Text className="rounded bg-[#f6f6f6] p-4 text-center text-base font-bold">
      {props.children}
    </Text>
  );
}

export function OTPCode(props: { children: React.ReactNode }) {
  return (
    <Text className="inline-block rounded bg-[#f6f6f6] p-4 text-2xl font-bold tracking-[0.2em]">
      {props.children}
    </Text>
  );
}

export function Avatar(props: {
  avatar: z.infer<typeof AvatarSchema>;
  size: number;
}) {
  const { avatar, size } = props;
  if (avatar.url) {
    return (
      <Img
        src={avatar.url}
        width={size}
        height={size}
        alt="Avatar"
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full"
      style={{
        backgroundColor: avatar.color,
        width: size,
        height: size,
        textAlign: "center",
      }}
    >
      <span
        className="text-lg font-bold text-white"
        style={{ fontSize: size / 2.5, lineHeight: `${size}px` }}
      >
        {avatar.initial}
      </span>
    </div>
  );
}

export function InfoText(props: { children: React.ReactNode }) {
  return <Text className="my-4 text-xs text-gray-700">{props.children}</Text>;
}

export function Button(props: ButtonProps) {
  return (
    <REButton
      {...props}
      className={clsx(
        "rounded bg-[#5746af] px-10 py-2.5 text-lg font-medium text-white",
        props.className,
      )}
    />
  );
}

export function FromLocation(props: {
  location: { city: string; country: string } | null;
}) {
  const { location } = props;
  if (!location) {
    return null;
  }
  return (
    <>
      {" "}
      from{" "}
      <strong>
        {location.city}, {location.country}
      </strong>
    </>
  );
}

export function SafetyDisclaimer() {
  return (
    <>
      If you are concerned about your account's safety, please{" "}
      <Link href="https://argos-ci.com/docs/contact-us">contact us</Link> to get
      in touch with us.
    </>
  );
}

export function SignupAgreement() {
  return (
    <Paragraph>
      Please note that by completing your sign-up you are agreeing to our{" "}
      <Link href="https://argos-ci.com/terms">Terms of Service</Link> and{" "}
      <Link href="https://argos-ci.com/privacy">Privacy Policy</Link>.
    </Paragraph>
  );
}

export function SigninDisclaimer(props: {
  location: z.infer<typeof LocationSchema>;
}) {
  return (
    <>
      If you didn't attempt to sign in but received this email,{" "}
      {props.location ? "or if the location doesn't match, " : ""}you can ignore
      this email. Don't share or forward the 6-digit code with anyone. Our
      customer service will never ask for it. Do not read this code out loud. Be
      cautious of phishing attempts and always verify the sender and domain
      (argos-ci.com) before acting. <SafetyDisclaimer />
    </>
  );
}

export function SignupDisclaimer(props: {
  location: z.infer<typeof LocationSchema>;
}) {
  return (
    <>
      If you didn't attempt to sign up but received this email,{" "}
      {props.location ? "or if the location doesn't match, " : ""}you can ignore
      this email. No account will be created. Don't share or forward the 6-digit
      code with anyone. Our customer service will never ask for it. Do not read
      this code out loud. Be cautious of phishing attempts and always verify the
      sender and domain (argos-ci.com) before acting. <SafetyDisclaimer />
    </>
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
