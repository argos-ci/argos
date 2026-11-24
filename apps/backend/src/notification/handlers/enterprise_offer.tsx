import { Section } from "react-email";
import { z } from "zod";

import { Button, EmailLayout, H1, Hi, Paragraph } from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

const bookACallHref = "https://cal.com/jsfez";

export const handler = defineNotificationHandler({
  type: "enterprise_offer",
  category: "billing",
  schema: z.object({
    accountName: z.string().nullish(),
    accountSlug: z.string(),
  }),
  previewData: {
    accountName: "Acme",
    accountSlug: "acme",
  },
  // An offer, not an alert: it names no amount and no threshold, so it reads
  // the same whenever it is opened, and its only job is to start a
  // conversation. Signed by a person because a reply is the point.
  email: (props) => {
    const { ctx } = props;
    const accountName = props.accountName || props.accountSlug;
    return {
      subject: `A better price for ${accountName} on Argos`,
      body: (
        <EmailLayout
          preview={`At ${accountName}’s volume, we can offer a better price than the Pro plan.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>Let’s find you a better price</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            We noticed that <strong>{accountName}</strong> runs a lot of
            screenshots on Argos. At this volume, we can offer you a better
            price than the Pro plan, along with SAML SSO, SCIM and dedicated
            support.
          </Paragraph>
          <Section className="my-4 text-center">
            <Button href={bookACallHref}>Book a call</Button>
          </Section>
          <Paragraph>If you’d rather write, reply to this email.</Paragraph>
          <Paragraph>
            Nothing changes for now: your builds keep running as usual.
          </Paragraph>
          <Paragraph>Jeremy from Argos</Paragraph>
        </EmailLayout>
      ),
    };
  },
});
