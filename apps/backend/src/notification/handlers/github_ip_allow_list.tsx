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

export const handler = defineNotificationHandler({
  type: "github_ip_allow_list",
  category: "integration",
  schema: z.object({
    githubOwner: z.object({
      name: z.string(),
      kind: z.string(),
    }),
    projects: z.array(
      z.object({
        name: z.string(),
        url: z.url(),
      }),
    ),
  }),
  previewData: {
    githubOwner: { name: "acme", kind: "organization" },
    projects: [
      { name: "web", url: "https://app.argos-ci.com/acme/web" },
      {
        name: "design-system",
        url: "https://app.argos-ci.com/acme/design-system",
      },
    ],
  },
  email: (props) => {
    const { githubOwner, projects, ctx } = props;
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
            The <strong>{githubOwner.name}</strong> GitHub {githubOwner.kind}{" "}
            has an IP allow list enabled, and it does not include the IP address
            Argos uses to reach GitHub. Until it does, builds of these projects
            may fail, and Argos can’t post commit statuses or pull request
            comments:
          </Paragraph>
          <ul>
            {projects.map((project) => (
              <li key={project.url}>
                <Link href={project.url}>{project.name}</Link>
              </li>
            ))}
          </ul>
          <Paragraph>
            To fix it, an owner of <strong>{githubOwner.name}</strong> needs to
            add Argos’s IP address to the allow list.{" "}
            <Link href="https://argos-ci.com/contact">Contact us</Link> to get
            it, we’ll be happy to help.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
