import * as React from "react";
import { z } from "zod";

import {
  EmailLayout,
  H1,
  Hi,
  HighlightBlock,
  Hr,
  Paragraph,
  SafetyInfo,
} from "../components";
import { defineEmailTemplate } from "../template";

export const handler = defineEmailTemplate({
  type: "email_added",
  schema: z.object({
    name: z.string(),
    email: z.email(),
  }),
  previewData: {
    name: "John Doe",
    email: "john.doe@example.com",
  },
  email: (props) => {
    const { name, email } = props;
    return {
      subject: "Argos Email Added",
      body: (
        <EmailLayout
          preview={`The email address ${email} has been added to your Argos account.`}
          footer={false}
        >
          <H1>An email was added to your Argos account</H1>
          <Hi name={name} />
          <Paragraph>
            The following email has been <strong>added</strong> to your account
            and is awaiting verification. Verify this email belongs to you by
            clicking on the link provided in the email sent to the newly added
            address.
          </Paragraph>
          <HighlightBlock>{props.email}</HighlightBlock>
          <Hr />
          <SafetyInfo />
        </EmailLayout>
      ),
    };
  },
});
