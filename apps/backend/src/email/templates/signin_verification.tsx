import * as React from "react";
import { Section } from "@react-email/components";
import { z } from "zod";

import {
  EmailLayout,
  FromLocation,
  H1,
  Hi,
  Hr,
  InfoText,
  OTPCode,
  Paragraph,
  SigninDisclaimer,
} from "../components";
import { LocationSchema } from "../schemas";
import { defineEmailTemplate } from "../template";

export const handler = defineEmailTemplate({
  type: "signin_verification",
  schema: z.object({
    name: z.string(),
    code: z.string(),
    location: LocationSchema,
  }),
  previewData: {
    name: "John Doe",
    code: "123456",
    location: {
      city: "Paris",
      country: "France",
      ip: "93.19.70.152",
    },
  },
  email: (props) => {
    const { code, location, name } = props;
    return {
      subject: `${code} - Argos Sign-in Verification`,
      body: (
        <EmailLayout
          preview={`Verify your email to sign in to Argos.`}
          footer={false}
        >
          <H1>Verify your email to sign in to Argos</H1>
          <Hi name={name} />
          <Paragraph>
            We have received a sign-in attempt
            <FromLocation location={location} />.
          </Paragraph>
          <Paragraph>
            To complete the sign-in process; enter the 6-digit code in the
            original window:
          </Paragraph>
          <Section className="text-center">
            <OTPCode>{code}</OTPCode>
          </Section>
          <Hr />
          <InfoText>
            <SigninDisclaimer location={location} />
          </InfoText>
        </EmailLayout>
      ),
    };
  },
});
