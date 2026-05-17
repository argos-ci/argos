import { z } from "zod";

import {
  EmailLayout,
  H1,
  Hi,
  Hr,
  InfoText,
  Link,
  Paragraph,
  SafetyDisclaimer,
} from "../components";
import { defineEmailTemplate } from "../template";

export const handler = defineEmailTemplate({
  type: "account_deleted",
  schema: z.object({
    name: z.string(),
  }),
  previewData: {
    name: "John Doe",
  },
  email: (props) => {
    const { name } = props;
    return {
      subject: "Your Argos account has been deleted",
      body: (
        <EmailLayout
          preview="Your Argos account has been deleted."
          footer={false}
        >
          <H1>Your Argos account has been deleted</H1>
          <Hi name={name} />
          <Paragraph>
            Your Argos account and all associated projects, builds, screenshots
            and settings have been <strong>permanently deleted</strong>.
          </Paragraph>
          <Paragraph>
            We're sorry to see you go. If you change your mind, you can create a
            new account at any time.
          </Paragraph>
          <Hr />
          <InfoText>
            If you didn't request this deletion, please{" "}
            <Link href="https://argos-ci.com/docs/contact-us">contact us</Link>.
          </InfoText>
        </EmailLayout>
      ),
    };
  },
});
