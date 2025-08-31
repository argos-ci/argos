import * as React from "react";
import { Section } from "@react-email/components";
import { z } from "zod";

import {
  EmailLayout,
  FromLocation,
  H1,
  Hr,
  InfoText,
  OTPCode,
  Paragraph,
  SignupAgreement,
  SignupDisclaimer,
} from "../components";
import { LocationSchema } from "../schemas";
import { defineEmailTemplate } from "../template";

export const handler = defineEmailTemplate({
  type: "signup_verification",
  schema: z.object({
    code: z.string(),
    location: LocationSchema,
  }),
  previewData: {
    code: "123456",
    location: {
      city: "Paris",
      country: "France",
    },
  },
  email: (props) => {
    const { code, location } = props;
    return {
      subject: `${code} - Argos Sign-up Verification`,
      body: (
        <EmailLayout
          preview={`Verify your email to sign-up for Argos.`}
          footer={false}
        >
          <H1>Verify your email to sign-up for Argos</H1>
          <Paragraph>
            We have received a sign-up attempt
            <FromLocation location={location} />.
          </Paragraph>
          <Paragraph>
            To complete the sign-up process; enter the 6-digit code in the
            original window:
          </Paragraph>
          <Section className="text-center">
            <OTPCode>{code}</OTPCode>
          </Section>
          <Hr />
          <SignupAgreement />
          <Hr />
          <InfoText>
            <SignupDisclaimer location={location} />
          </InfoText>
        </EmailLayout>
      ),
    };
  },
});
