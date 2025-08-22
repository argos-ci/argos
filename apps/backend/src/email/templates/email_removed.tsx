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
  type: "email_removed",
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
      subject: "Argos Email Removed",
      body: (
        <EmailLayout
          preview={`The email address ${email} has been removed from your Argos account.`}
          footer={false}
        >
          <H1>An email was removed from your Argos account</H1>
          <Hi name={name} />
          <Paragraph>
            The following email has been <strong>removed</strong> from your
            account.
          </Paragraph>
          <HighlightBlock>{props.email}</HighlightBlock>
          <Hr />
          <SafetyInfo />
        </EmailLayout>
      ),
    };
  },
});
