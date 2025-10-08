import * as React from "react";
import { Heading } from "@react-email/components";
import { z } from "zod";

import { EmailLayout, H1, Hr, Link, Paragraph, Signature } from "../components";
import { defineEmailTemplate } from "../template";

export const handler = defineEmailTemplate({
  type: "new_pricing",
  schema: z.object({
    afterDate: z.date(),
  }),
  previewData: {
    afterDate: new Date("2024-12-01"),
  },
  email: (props) => {
    const { afterDate } = props;
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return {
      subject: "Upcoming changes to Argos’s pricing",
      body: (
        <EmailLayout
          preview={`We’re writing to let you know about some upcoming changes to Argos’s pricing.`}
          footer={false}
        >
          <H1>Upcoming changes to Argos’s pricing</H1>
          <Paragraph>Hi,</Paragraph>
          <Paragraph className="mb-8">
            Starting <strong>{formatter.format(afterDate)}</strong>, Argos
            pricing is evolving.
            <br />
            You’ll get <strong>more included screenshots</strong> and{" "}
            <strong>cheaper Storybook usage</strong>.
          </Paragraph>
          <table className="mb-8 w-full border-collapse p-2 text-sm">
            <thead>
              <tr>
                <th className="border-0 border-b-2 border-solid border-gray-200"></th>
                <th className="w-28 border-0 border-b-2 border-solid border-gray-200 pb-3 text-left">
                  Actual Plan
                </th>
                <th className="w-28 border-0 border-b-2 border-solid border-gray-200 pb-3 text-left">
                  New Plan
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="border-0 border-b border-solid border-gray-200 px-4 py-3 text-left">
                  Flat price (monthly)
                </th>
                <td className="border-0 border-b border-solid border-gray-200">
                  $30
                </td>
                <td className="border-0 border-b border-solid border-gray-200">
                  $100
                </td>
              </tr>
              <tr>
                <th className="border-0 border-b border-solid border-gray-200 px-4 py-3 text-left">
                  Included screenshots
                </th>
                <td className="border-0 border-b border-solid border-gray-200">
                  15,000
                </td>
                <td className="border-0 border-b border-solid border-gray-200">
                  35,000
                </td>
              </tr>
              <tr>
                <th className="border-0 border-b border-solid border-gray-200 px-4 py-3 text-left">
                  Extra Storybook screenshot
                </th>
                <td className="border-0 border-b border-solid border-gray-200">
                  $0.0025
                </td>
                <td className="border-0 border-b border-solid border-gray-200">
                  $0.0015
                </td>
              </tr>
              <tr>
                <th className="px-4 py-3 text-left">
                  Extra Classic screenshot
                  <br />
                  <small className="font-normal italic text-gray-600">
                    All non-Storybook screenshots
                  </small>
                </th>
                <td>$0.0025</td>
                <td>$0.004</td>
              </tr>
            </tbody>
          </table>
          <Heading as="h2" className="my-4 text-sm leading-relaxed">
            Why these changes?
          </Heading>
          <ul className="my-4 text-sm leading-relaxed">
            <li className="my-2">
              <strong>Storybook-first:</strong> Storybook generates many small
              screenshots. Since they cost us less to process, we’re lowering
              their price to encourage you to capture all your stories and
              variants without constraint.
            </li>
            <li className="my-2">
              <strong>More value built in:</strong> 35,000 included screenshots
              per month (over 2× more than today).
            </li>
            <li className="my-2">
              <strong>Sustainable quality:</strong> SOC 2 certification, 99.99%
              SLA, new features like{" "}
              <Link href="https://argos-ci.com/changelog/2025-07-20-ignore-changes">
                Ignore Changes
              </Link>{" "}
              and{" "}
              <Link href="https://argos-ci.com/changelog/2025-06-26-flaky-test-detection">
                Flaky Test Detection
              </Link>
              , to make sure you can trust us at scale.
            </li>
          </ul>
          <Hr />
          <Paragraph>
            <strong>
              Starting on your first renewal after {formatter.format(afterDate)}
              , the new pricing will be applied automatically.
            </strong>
          </Paragraph>
          <Hr />
          <Paragraph>
            We understand that a price increase may raise questions. Feel free
            to reply directly to this email if you’d like to discuss it or
            review the best option for your team.
          </Paragraph>
          <Paragraph>
            Thank you for your trust and for being part of the team.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
