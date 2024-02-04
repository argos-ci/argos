import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const body = {
  fontFamily: "sans-serif",
  backgroundColor: "#fff",
  margin: "auto",
};

const container = {
  border: "1px solid #eaeaea",
  borderRadius: "4px",
  margin: "40px auto",
  padding: "20px",
  width: "465px",
};

const h1 = {
  fontSize: "24px",
  fontWeight: "normal",
  textAlign: "center" as const,
  margin: "32px 0",
  padding: 0,
};

const hr = {
  border: "none",
  borderTop: "1px solid #eaeaea",
  margin: "32px 0",
  width: "100%",
};

const guideSection = {
  margin: "32px 0",
};

const h2 = {
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 10px 0",
  padding: 0,
};

const link = {
  color: "#5746af",
};

const text = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#000",
  margin: "16px 0",
};

export const WelcomeEmail = ({ baseUrl }: { baseUrl: string }) => {
  return (
    <Html>
      <Head />
      <Preview>Get started with Argos!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={{ marginTop: 32 }}>
            <Img
              src={`${baseUrl}/static/emails/argos-logo.png`}
              width="40"
              height="40"
              alt="Argos"
              style={{ margin: "0 auto" }}
            />
          </Section>
          <Heading style={h1}>Welcome to Argos!</Heading>
          <Text style={text}>We are excited to have you on board!</Text>
          <Text style={text}>
            Once you're ready to create your own Argos project, follow these
            guides to integrate visual testing into your workflow.
          </Text>
          <Hr style={hr} />
          <Section style={guideSection}>
            <Heading as="h2" style={h2}>
              <Link
                style={link}
                href="https://argos-ci.com/docs/getting-started"
              >
                Set up Argos →
              </Link>
            </Heading>
            <Text style={{ ...text, margin: 0 }}>
              Use one of our Quickstart guides to install Argos into your
              project.
            </Text>
          </Section>
          <Section style={guideSection}>
            <Heading as="h2" style={h2}>
              <Link
                style={link}
                href="https://argos-ci.com/docs/screenshot-pages-script"
              >
                Screenshot your whole app →
              </Link>
            </Heading>
            <Text style={{ ...text, margin: 0 }}>
              Discover a script to efficiently cover all your pages against
              regressions with Argos.
            </Text>
          </Section>
          <Section style={guideSection}>
            <Heading as="h2" style={h2}>
              <Link style={link} href="https://youtu.be/QiJk2ZViN7c">
                Demo Video: Review changes in Argos →
              </Link>
            </Heading>
            <Text style={{ ...text, margin: 0 }}>
              Learn how to review visual changes of your app for a pull request,
              avoid UI bugs and merge with confidence!
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={text}>
            We hope you will enjoy using Argos! Have a question, feedback or
            need some guidance? Just hit reply, and let's make your Argos
            experience even better.
          </Text>
          <Text style={text}>— The Argos Team 💌</Text>
          <Hr style={hr} />
          <Link
            style={{ color: "#8E8C99", fontSize: "14px", fontWeight: "bold" }}
            href="https://argos-ci.com"
          >
            Argos
          </Link>
        </Container>
      </Body>
    </Html>
  );
};
