import * as React from "react";
import { Heading, Section } from "@react-email/components";

import { Handler } from ".";
import {
  EmailLayout,
  H2,
  Hr,
  Link,
  Paragraph,
  Signature,
} from "../email-components";

export const previewData: Handler<"welcome">["previewData"] = {};

export const email: Handler<"welcome">["email"] = () => {
  return {
    subject: "Welcome to Argos!",
    body: (
      <EmailLayout centered preview="Get started with Argos">
        <Heading className="mb-8 p-0 text-center text-2xl font-normal">
          Welcome to Argos!
        </Heading>
        <Paragraph>We are excited to have you on board!</Paragraph>
        <Paragraph>
          Once you're ready to create your own Argos project, follow these
          guides to integrate visual testing into your workflow.
        </Paragraph>
        <Hr />
        <Section className="my-8">
          <H2>
            <Link href="https://argos-ci.com/docs/getting-started">
              Set up Argos →
            </Link>
          </H2>
          <Paragraph style={{ margin: 0 }}>
            Use one of our Quickstart guides to install Argos into your project.
          </Paragraph>
        </Section>
        <Section className="my-8">
          <H2>
            <Link href="https://argos-ci.com/docs/screenshot-pages-script">
              Screenshot your whole app →
            </Link>
          </H2>
          <Paragraph style={{ margin: 0 }}>
            Discover a script to efficiently cover all your pages against
            regressions with Argos.
          </Paragraph>
        </Section>
        <Section className="my-8">
          <H2>
            <Link href="https://youtu.be/QiJk2ZViN7c">
              Demo Video: Review changes in Argos →
            </Link>
          </H2>
          <Paragraph style={{ margin: 0 }}>
            Learn how to review visual changes of your app for a pull request,
            avoid UI bugs and merge with confidence!
          </Paragraph>
        </Section>
        <Hr />
        <Paragraph>
          We hope you will enjoy using Argos! Have a question, feedback or need
          some guidance? Just hit reply, and let's make your Argos experience
          even better.
        </Paragraph>
        <Signature />
      </EmailLayout>
    ),
  };
};
