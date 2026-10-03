import { assertNever } from "@argos/util/assertNever";
import { Section } from "react-email";
import { z } from "zod";

import {
  Button,
  EmailLayout,
  H1,
  Hi,
  HighlightBlock,
  Link,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

export const handler = defineNotificationHandler({
  type: "github_ip_allow_list",
  category: "integration",
  schema: z.object({
    githubOwner: z.object({
      name: z.string(),
      kind: z.string(),
    }),
    /**
     * What the account can do about it: enable Static IP, add the static IP
     * addresses the refused calls already left from, or nothing on its own.
     */
    staticIp: z.discriminatedUnion("status", [
      z.object({ status: z.literal("available"), settingsURL: z.url() }),
      z.object({
        status: z.literal("proxied"),
        addresses: z.array(z.string()),
      }),
      z.object({ status: z.literal("unavailable") }),
    ]),
    projects: z.array(
      z.object({
        name: z.string(),
        url: z.url(),
      }),
    ),
  }),
  previewData: {
    githubOwner: { name: "acme", kind: "organization" },
    staticIp: {
      status: "available",
      settingsURL:
        "https://app.argos-ci.com/acme/settings/integrations#static-ip",
    },
    projects: [
      { name: "web", url: "https://app.argos-ci.com/acme/web" },
      {
        name: "design-system",
        url: "https://app.argos-ci.com/acme/design-system",
      },
    ],
  },
  email: (props) => {
    const { githubOwner, staticIp, projects, ctx } = props;
    const owner = <strong>{githubOwner.name}</strong>;
    const fix = (() => {
      switch (staticIp.status) {
        case "available":
          return (
            <>
              <Paragraph>
                To let Argos through, enable Static IP: Argos will then reach
                GitHub from static IP addresses that an owner of {owner} can add
                to the allow list.
              </Paragraph>
              <Section className="my-4 text-center">
                <Button href={staticIp.settingsURL}>Enable Static IP</Button>
              </Section>
            </>
          );
        case "proxied":
          return (
            <>
              <Paragraph>
                Argos already reaches GitHub from its static IP addresses for{" "}
                {owner}. To let it through, an owner of {owner} needs to add
                them to the allow list:
              </Paragraph>
              <HighlightBlock>
                {staticIp.addresses.map((address) => (
                  <span key={address} className="block">
                    {address}
                  </span>
                ))}
              </HighlightBlock>
            </>
          );
        case "unavailable":
          return (
            <Paragraph>
              Static IP, which lets Argos reach GitHub from addresses an owner
              of {owner} can add to the allow list, is available for teams: move
              these projects to a team to enable it.
            </Paragraph>
          );
        default:
          assertNever(staticIp);
      }
    })();
    return {
      subject: `[Action required] The ${githubOwner.name} GitHub ${githubOwner.kind} is blocking Argos`,
      body: (
        <EmailLayout
          preview={`The ${githubOwner.name} GitHub ${githubOwner.kind} has an IP allow list enabled that blocks Argos.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>GitHub is blocking Argos</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            The {owner} GitHub {githubOwner.kind} has an IP allow list enabled,
            and it does not include the IP address Argos uses to reach GitHub.
            Until it does, builds of these projects may fail, and Argos can’t
            post commit statuses or pull request comments:
          </Paragraph>
          <ul>
            {projects.map((project) => (
              <li key={project.url}>
                <Link href={project.url}>{project.name}</Link>
              </li>
            ))}
          </ul>
          {fix}
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
