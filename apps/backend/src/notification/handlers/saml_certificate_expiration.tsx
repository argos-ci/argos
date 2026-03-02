import * as React from "react";
import { z } from "zod";

import config from "@/config";

import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

const baseUrl = config.get("server.url");

export const handler = defineNotificationHandler({
  type: "saml_certificate_expiration",
  schema: z.object({
    accountName: z.string().nullable().optional(),
    accountSlug: z.string(),
    daysBeforeExpiration: z.union([
      z.literal(30),
      z.literal(7),
      z.literal(3),
      z.literal(1),
    ]),
    expirationDate: z.string().datetime(),
  }),
  previewData: {
    accountName: "Argos",
    accountSlug: "argos",
    daysBeforeExpiration: 7,
    expirationDate: new Date("10-30-1985").toISOString(),
  },
  email: (props) => {
    const accountName = props.accountName || props.accountSlug;
    const settingsHref = new URL(
      `/${props.accountSlug}/settings/security-and-privacy`,
      baseUrl,
    ).href;
    return {
      subject: `SAML certificate expires in ${props.daysBeforeExpiration} day${props.daysBeforeExpiration > 1 ? "s" : ""}`,
      body: (
        <EmailLayout
          preview={`Your team SAML certificate for ${accountName} expires in ${props.daysBeforeExpiration} day${props.daysBeforeExpiration > 1 ? "s" : ""}.`}
        >
          <H1>SAML certificate expires soon</H1>
          <Hi name={props.ctx.user.name} />
          <Paragraph>
            The SAML signing certificate for <strong>{accountName}</strong>{" "}
            expires in <strong>{props.daysBeforeExpiration} day</strong>
            {props.daysBeforeExpiration > 1 ? "s" : ""} (
            {new Date(props.expirationDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            ).
          </Paragraph>
          <Paragraph>
            Please update the certificate in your{" "}
            <Link href={settingsHref}>team settings</Link> to avoid SSO login
            interruptions.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
