import * as React from "react";
import { Button, Section } from "@react-email/components";
import { z } from "zod";

import {
  EmailLayout,
  H1,
  Hi,
  HighlightBlock,
  Hr,
  InfoText,
  Link,
  Paragraph,
} from "../components";
import { defineEmailTemplate } from "../template";

export const handler = defineEmailTemplate({
  type: "email_verification",
  schema: z.object({
    name: z.string(),
    email: z.email(),
    verifyUrl: z.url(),
  }),
  previewData: {
    name: "John Doe",
    email: "john.doe@example.com",
    verifyUrl:
      "https://argos-ci.com/verify?email=john.doe%40example.com&token=xxx",
  },
  email: (props) => {
    const { name, email, verifyUrl } = props;
    return {
      subject: "Argos Email Verification",
      body: (
        <EmailLayout
          preview={`Verify your email address ${email}.`}
          footer={false}
        >
          <H1>An email was added to your Argos account</H1>
          <Hi name={name} />
          <Paragraph>
            The following email has been <strong>added</strong> to your account.
            Verify this email belongs to you to use it with your Argos account.
          </Paragraph>
          <HighlightBlock>{props.email}</HighlightBlock>
          <Paragraph>
            To complete the email verification process, please click the button
            below:
          </Paragraph>
          <Section className="my-4 text-center">
            <Button
              href={verifyUrl}
              className="rounded bg-[#5746af] px-10 py-2.5 text-lg font-medium text-white"
            >
              Verify Email
            </Button>
          </Section>
          <Paragraph>
            Or copy and paste this URL into a new tab of your browser:
          </Paragraph>
          <Link href={verifyUrl}>{verifyUrl}</Link>
          <Hr />
          <InfoText>
            If you didn't attempt to add {email} to your account, please ignore
            this email. If you are concerned about your account's safety, please{" "}
            <Link href="https://argos-ci.com/docs/contact-us">contact us</Link>{" "}
            to get in touch with us.
          </InfoText>
        </EmailLayout>
      ),
    };
  },
});
