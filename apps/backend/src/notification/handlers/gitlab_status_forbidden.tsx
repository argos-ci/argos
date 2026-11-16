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
  type: "gitlab_status_forbidden",
  category: "integration",
  schema: z.object({
    project: z.object({
      name: z.string(),
      url: z.url(),
    }),
    gitlabProject: z.object({
      path: z.string(),
      url: z.url(),
    }),
    /** Branch of the build whose status GitLab refused. */
    branch: z.string(),
    /** Where the account's GitLab token is replaced. */
    settingsURL: z.url(),
  }),
  previewData: {
    project: {
      name: "web",
      url: "https://app.argos-ci.com/acme/web",
    },
    gitlabProject: {
      path: "acme/web",
      url: "https://gitlab.com/acme/web",
    },
    branch: "main",
    settingsURL: "https://app.argos-ci.com/acme/settings/integrations#gitlab",
  },
  email: (props) => {
    const { project, gitlabProject, branch, settingsURL, ctx } = props;
    const gitlabProjectLink = (
      <Link href={gitlabProject.url}>{gitlabProject.path}</Link>
    );
    return {
      subject: `[Action required] GitLab refuses Argos commit statuses on ${gitlabProject.path}`,
      body: (
        <EmailLayout
          preview={`GitLab refused the Argos commit status of a build on ${branch}.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>GitLab refuses Argos commit statuses</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            GitLab refused the commit status of a{" "}
            <Link href={project.url}>{project.name}</Link> build on the{" "}
            <strong>{branch}</strong> branch of {gitlabProjectLink}. Until this
            is fixed, GitLab pipelines on <strong>{branch}</strong> don’t show
            the Argos result.
          </Paragraph>
          <Paragraph>The GitLab user behind your access token needs:</Paragraph>
          <ul className="text-sm leading-relaxed text-gray-950">
            <li>at least the Developer role on {gitlabProjectLink}</li>
            <li>
              permission to push or merge to <strong>{branch}</strong>, if it is
              a protected branch
            </li>
          </ul>
          <Paragraph>
            Grant these permissions in GitLab, or{" "}
            <Link href={settingsURL}>replace the token</Link> with one from a
            user who has them, such as a Maintainer.
          </Paragraph>
          <Paragraph>
            <Link href="https://argos-ci.com/docs/learn/integrations/gitlab-integration#token-permissions">
              Learn more about GitLab token permissions
            </Link>
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
