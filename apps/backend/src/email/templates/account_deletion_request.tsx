import { Section } from "react-email";
import { z } from "zod";

import {
  Button,
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
  type: "account_deletion_request",
  schema: z.object({
    name: z.string(),
    confirmUrl: z.url(),
  }),
  previewData: {
    name: "John Doe",
    confirmUrl: "https://argos-ci.com/account/delete?token=xxx",
  },
  email: (props) => {
    const { name, confirmUrl } = props;
    return {
      subject: "Confirm your Argos account deletion",
      body: (
        <EmailLayout
          preview="Confirm the deletion of your Argos account."
          footer={false}
        >
          <H1>Confirm your account deletion</H1>
          <Hi name={name} />
          <Paragraph>
            We received a request to <strong>delete your Argos account</strong>.
            This action is <strong>permanent and irreversible</strong>: all of
            your projects, builds, screenshots and settings will be removed.
          </Paragraph>
          <Paragraph>
            To confirm this request, please click the button below. The link
            will expire in 15 minutes.
          </Paragraph>
          <Section className="my-4 text-center">
            <Button href={confirmUrl}>Confirm account deletion</Button>
          </Section>
          <Paragraph>
            Or copy and paste this URL into a new tab of your browser:
          </Paragraph>
          <Link href={confirmUrl}>{confirmUrl}</Link>
          <Hr />
          <InfoText>
            If you didn't request to delete your account, you can safely ignore
            this email — your account will remain active. <SafetyDisclaimer />
          </InfoText>
        </EmailLayout>
      ),
    };
  },
});
