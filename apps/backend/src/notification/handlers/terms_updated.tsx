import { z } from "zod";

import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

/** Formats an ISO date (YYYY-MM-DD) the way the terms themselves spell it out. */
function formatEffectiveDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * Notice that the terms of service and privacy policy changed.
 *
 * Section 28 of the terms promises paid subscriptions at least thirty days'
 * notice before a material change takes effect, so this sits in the `account`
 * category: it is not configurable and reaches every recipient regardless of
 * their notification preferences.
 */
export const handler = defineNotificationHandler({
  type: "terms_updated",
  category: "account",
  schema: z.object({
    /** Date the new terms take effect for existing paid subscriptions, as YYYY-MM-DD. */
    effectiveDate: z.string(),
  }),
  previewData: { effectiveDate: "2026-09-11" },
  email: (props) => {
    const effectiveDate = formatEffectiveDate(props.effectiveDate);
    return {
      subject: "Updates to our Terms of Service and Privacy Policy",
      body: (
        <EmailLayout preview="Our terms of service and privacy policy have been updated">
          <H1>Updates to our Terms of Service and Privacy Policy</H1>
          <Hi name={props.ctx.user.name} />
          <Paragraph>
            We’ve updated our Terms of Service and Privacy Policy. They take
            effect on {effectiveDate} for your subscription.
          </Paragraph>
          <Paragraph>
            How Argos works and what you pay are unchanged, and there’s nothing
            you need to do. If you’d rather not accept the updated terms, you
            can cancel before that date and we’ll refund the unused portion of
            your current billing period.
          </Paragraph>
          <Paragraph>
            <Link href="https://argos-ci.com/terms">Terms of Service</Link>
            {" · "}
            <Link href="https://argos-ci.com/privacy">Privacy Policy</Link>
          </Paragraph>
          <Paragraph>
            If you have any questions, just reply to this email.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
