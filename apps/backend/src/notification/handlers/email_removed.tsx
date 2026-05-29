import { z } from "zod";

import {
  EmailLayout,
  H1,
  Hi,
  HighlightBlock,
  Hr,
  InfoText,
  Paragraph,
  SafetyDisclaimer,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

export const handler = defineNotificationHandler({
  type: "email_removed",
  category: "security",
  schema: z.object({
    email: z.email(),
  }),
  previewData: {
    email: "john.doe@example.com",
  },
  email: (props) => {
    const { email, ctx } = props;
    return {
      subject: "Argos Email Removed",
      body: (
        <EmailLayout
          preview={`The email address ${email} has been removed from your Argos account.`}
          footer={false}
        >
          <H1>An email was removed from your Argos account</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            The following email has been <strong>removed</strong> from your
            account.
          </Paragraph>
          <HighlightBlock>{email}</HighlightBlock>
          <Hr />
          <InfoText>
            <SafetyDisclaimer />
          </InfoText>
        </EmailLayout>
      ),
    };
  },
});
