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
  type: "email_added",
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
      subject: "Argos Email Added",
      body: (
        <EmailLayout
          preview={`The email address ${email} has been added to your Argos account.`}
          footer={false}
        >
          <H1>An email was added to your Argos account</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            The following email has been <strong>added</strong> to your account
            and is awaiting verification. Verify this email belongs to you by
            clicking on the link provided in the email sent to the newly added
            address.
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
