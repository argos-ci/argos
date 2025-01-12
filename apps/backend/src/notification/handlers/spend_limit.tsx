import * as React from "react";
import { assertNever } from "@argos/util/assertNever";

import config from "@/config";

import { Handler } from ".";
import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../email-components";

const baseUrl = config.get("server.url");

export const previewData: Handler<"spend_limit">["previewData"] = {
  threshold: 100,
  accountName: "Argos",
  accountSlug: "argos",
};

export const email: Handler<"spend_limit">["email"] = (props) => {
  const { threshold, ctx } = props;
  const accountName = props.accountName || props.accountSlug;
  const settingsHref = new URL(`/${props.accountSlug}/settings`, baseUrl).href;
  return {
    subject: `Your team has reached ${threshold}% of its spend limit`,
    body: (
      <EmailLayout
        preview={`You’re at ${threshold}% of your spend limit for this cycle. Check your usage now.`}
      >
        <H1>Your team has reached {threshold}% of its spend limit</H1>
        <Hi ctx={ctx} />
        {(() => {
          switch (threshold) {
            case 50: {
              return (
                <>
                  <Paragraph>
                    We wanted to let you know that your team,{" "}
                    <strong>{accountName}</strong>, has reached{" "}
                    <strong>50%</strong> of its allocated spend for this billing
                    cycle.
                  </Paragraph>
                  <Paragraph>
                    This is just a friendly reminder to help you monitor your
                    usage and avoid any surprises. If you’d like to review your
                    current usage details or adjust your plan, feel free to
                    visit your <Link href={settingsHref}>team settings</Link>.
                  </Paragraph>
                </>
              );
            }
            case 75: {
              return (
                <>
                  <Paragraph>
                    Heads up! Your team, <strong>{accountName}</strong>, has now
                    reached <strong>75%</strong> of its allocated spend for this
                    billing cycle.
                  </Paragraph>
                  <Paragraph>
                    We recommend keeping an eye on your remaining usage. If you
                    think you might exceed your limit, you can{" "}
                    <Link href={settingsHref}>
                      adjust your spend limit in the team settings
                    </Link>
                    .
                  </Paragraph>
                </>
              );
            }
            case 100: {
              return (
                <>
                  <Paragraph>
                    Your team, <strong>{accountName}</strong>, has now reached{" "}
                    <strong>100%</strong> of its allocated spend for this
                    billing cycle.
                  </Paragraph>
                  <Paragraph>
                    Depending on your plan, additional charges may apply for
                    further usage. To review your current usage or explore
                    options to manage your spend, please visit your{" "}
                    <Link href={settingsHref}>team settings</Link>.
                  </Paragraph>
                </>
              );
            }
            default:
              assertNever(threshold);
          }
        })()}
        <Paragraph>
          If you have any questions or need assistance, don’t hesitate to reach
          out.
        </Paragraph>
        <Signature />
      </EmailLayout>
    ),
  };
};
