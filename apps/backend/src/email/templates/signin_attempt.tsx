import * as React from "react";
import { Section } from "@react-email/components";
import { z } from "zod";

import config from "@/config";

import {
  Button,
  EmailLayout,
  FromLocation,
  H1,
  Hr,
  InfoText,
  Paragraph,
  SignupAgreement,
  SignupDisclaimer,
} from "../components";
import { LocationSchema } from "../schemas";
import { defineEmailTemplate } from "../template";

export const handler = defineEmailTemplate({
  type: "signin_attempt",
  schema: z.object({
    location: LocationSchema,
    email: z.email(),
  }),
  previewData: {
    location: {
      city: "Paris",
      country: "France",
    },
    email: "john.doe@example.com",
  },
  email: (props) => {
    const { location, email } = props;
    const signupURL = new URL("/signup", config.get("server.url"));
    signupURL.searchParams.set("email", email);
    return {
      subject: `Attempted Argos Sign-in`,
      body: (
        <EmailLayout
          preview={`You attempted to sign in on Argos, but do not have an account.`}
          footer={false}
        >
          <H1>You attempted to sign in on Argos, but do not have an account</H1>
          <Paragraph>Hello,</Paragraph>
          <Paragraph>
            We have received a sign-up attempt
            <FromLocation location={location} />, however, we couldn't find an
            account associated with this email address.
          </Paragraph>
          <Paragraph>
            If you would like to create a new account, please click the button
            below:
          </Paragraph>
          <Section className="my-4 text-center">
            <Button href={signupURL.toString()}>Sign up</Button>
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
