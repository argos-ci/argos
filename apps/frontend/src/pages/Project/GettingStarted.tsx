import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  CheckIcon,
  GitBranchIcon,
  GitCommitHorizontalIcon,
  SquareTerminalIcon,
} from "lucide-react";
import { RadioButton, RadioField, RadioGroup } from "react-aria-components";
import { useResolvedPath } from "react-router-dom";

import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { DocumentType, graphql } from "@/gql";
import { LinkButton } from "@/ui/Button";
import { Code } from "@/ui/Code";
import { HeadlessLink, Link, LinkButton as TextLinkButton } from "@/ui/Link";
import { Loader } from "@/ui/Loader";
import { PageLoader } from "@/ui/PageLoader";
import { Pre } from "@/ui/Pre";
import { Time } from "@/ui/Time";
import { getItem, setItem } from "@/util/storage";

import { AutomationLibraryIcon } from "../Build/metadata/automationLibrary/AutomationLibraryIcon";
import { useProjectParams } from "./ProjectParams";

const _ProjectFragment = graphql(`
  fragment GettingStarted_Project on Project {
    id
    token
  }
`);

const _BuildFragment = graphql(`
  fragment GettingStartedBuild_Build on Build {
    id
    number
    branch
    commit
    createdAt
    type
    ...BuildStatusChip_Build
  }
`);

const GettingStartedQuery = graphql(`
  query GettingStarted_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      builds(first: 1, after: 0) {
        pageInfo {
          totalCount
        }
        edges {
          id
          ...GettingStartedBuild_Build
        }
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

type Framework = {
  id: "playwright" | "vitest" | "storybook" | "cypress" | "webdriverio" | "cli";
  name: string;
  logo: React.ReactNode;
  docsURL: string;
  /**
   * Whether the SDK only uploads when a CI environment is detected, requiring
   * `CI=true` to upload from a local run.
   */
  requiresCIEnv: boolean;
  getCommand: (token: string) => string;
  getPrompt: (token: string) => string;
};

function getPromptIntro(name: string) {
  return `Set up Argos visual testing (https://argos-ci.com) in this project. It uses ${name}.`;
}

function getPromptGuide(docsURL: string) {
  return `Fetch the quickstart guide at ${docsURL}.md and apply each step to this project.`;
}

const logoClassName = "size-8";

const FRAMEWORKS: Framework[] = [
  {
    id: "playwright",
    name: "Playwright",
    logo: <AutomationLibraryIcon name="playwright" className={logoClassName} aria-hidden />,
    docsURL: "https://argos-ci.com/docs/quickstart/playwright-quickstart",
    requiresCIEnv: true,
    getCommand: (token) => `ARGOS_TOKEN=${token} CI=true npx playwright test`,
    getPrompt(token) {
      return `${getPromptIntro(this.name)}

${getPromptGuide(this.docsURL)}

Then run the tests to send a first build to Argos. CI=true simulates a CI environment so the reporter uploads screenshots:

${this.getCommand(token)}`;
    },
  },
  {
    id: "vitest",
    name: "Vitest",
    logo: <AutomationLibraryIcon name="vitest" className={logoClassName} aria-hidden />,
    docsURL: "https://argos-ci.com/docs/quickstart/vitest-quickstart",
    requiresCIEnv: true,
    getCommand: (token) => `ARGOS_TOKEN=${token} CI=true npx vitest run`,
    getPrompt(token) {
      return `${getPromptIntro(this.name)}

${getPromptGuide(this.docsURL)}

Then run the tests to send a first build to Argos. CI=true simulates a CI environment so the plugin uploads screenshots:

${this.getCommand(token)}`;
    },
  },
  {
    id: "storybook",
    name: "Storybook",
    logo: <AutomationLibraryIcon name="storybook" className={logoClassName} aria-hidden />,
    docsURL: "https://argos-ci.com/docs/quickstart/storybook-quickstart",
    requiresCIEnv: true,
    getCommand: (token) =>
      `ARGOS_TOKEN=${token} CI=true npx vitest run --project=storybook`,
    getPrompt(token) {
      return `${getPromptIntro("Storybook with the Vitest addon")}

${getPromptGuide(this.docsURL)}

Then run the tests to send a first build to Argos. CI=true simulates a CI environment so the plugin uploads screenshots:

${this.getCommand(token)}`;
    },
  },
  {
    id: "cypress",
    name: "Cypress",
    logo: <AutomationLibraryIcon name="cypress" className={logoClassName} aria-hidden />,
    docsURL: "https://argos-ci.com/docs/quickstart/cypress-quickstart",
    requiresCIEnv: true,
    getCommand: (token) => `ARGOS_TOKEN=${token} CI=true npx cypress run`,
    getPrompt(token) {
      return `${getPromptIntro(this.name)}

${getPromptGuide(this.docsURL)}

Then run the tests to send a first build to Argos. CI=true simulates a CI environment so the task uploads screenshots:

${this.getCommand(token)}`;
    },
  },
  {
    id: "webdriverio",
    name: "WebdriverIO",
    logo: (
      <AutomationLibraryIcon name="webdriverio" className={logoClassName} aria-hidden />
    ),
    docsURL: "https://argos-ci.com/docs/quickstart/webdriverio-quickstart",
    requiresCIEnv: false,
    getCommand: (token) =>
      `npm test\nARGOS_TOKEN=${token} npx argos upload ./screenshots/argos`,
    getPrompt(token) {
      return `${getPromptIntro(this.name)}

${getPromptGuide(this.docsURL)}

Then run the tests and upload the screenshots to send a first build to Argos:

${this.getCommand(token)}`;
    },
  },
  {
    id: "cli",
    name: "Other (CLI)",
    logo: <SquareTerminalIcon className={logoClassName} strokeWidth={1.5} />,
    docsURL: "https://argos-ci.com/docs/quickstart/any-test-framework",
    requiresCIEnv: false,
    getCommand: (token) =>
      `npm test\nARGOS_TOKEN=${token} npx argos upload ./screenshots`,
    getPrompt(token) {
      return `Set up Argos visual testing (https://argos-ci.com) in this project with the Argos CLI: the tests capture screenshots into a folder and the CLI uploads that folder to Argos.

${getPromptGuide(this.docsURL)}

Then run the tests and upload the screenshots folder to send a first build to Argos:

${this.getCommand(token)}`;
    },
  },
];

function checkIsFrameworkId(value: unknown): value is Framework["id"] {
  return FRAMEWORKS.some((framework) => framework.id === value);
}

/**
 * Remember the framework selected for a project across visits, so the
 * instructions stay consistent between onboarding steps.
 */
function useFramework(projectId: string) {
  const storageKey = `project.${projectId}.getting-started.framework`;
  const [id, setId] = useState<Framework["id"]>(() => {
    const stored = getItem(storageKey);
    return checkIsFrameworkId(stored) ? stored : "playwright";
  });
  const framework = FRAMEWORKS.find((framework) => framework.id === id);
  invariant(framework, "framework is always found");
  const select = (value: Framework["id"]) => {
    setId(value);
    setItem(storageKey, value);
  };
  return [framework, select] as const;
}

export function GettingStarted(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const params = useProjectParams();
  invariant(params, "it is a project route");
  const token = project.token ?? "<ARGOS_TOKEN>";
  const [framework, selectFramework] = useFramework(project.id);

  const { data, error } = useQuery(GettingStartedQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
    pollInterval: 5000,
  });

  if (error) {
    throw error;
  }

  if (!data?.project) {
    return <PageLoader />;
  }

  const { totalCount } = data.project.builds.pageInfo;
  const latestBuild = data.project.builds.edges[0] ?? null;
  const buildCount = latestBuild ? totalCount : 0;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Get started</h1>
        <p className="text-low mt-2 mb-10">
          Install Argos, send builds from your terminal and review your first
          visual diff. This page follows your progress automatically.
        </p>
        <ol>
          <InstallStep
            buildCount={buildCount}
            token={token}
            framework={framework}
            selectFramework={selectFramework}
          />
          <FirstBuildStep
            buildCount={buildCount}
            build={latestBuild}
            token={token}
            framework={framework}
          />
          <DiffStep
            buildCount={buildCount}
            build={latestBuild}
            token={token}
            framework={framework}
          />
          <ReviewStep
            buildCount={buildCount}
            build={latestBuild}
            framework={framework}
            isLast
          />
        </ol>
      </div>
    </div>
  );
}

/**
 * Step 1 — Pick a framework and set up Argos in the project.
 */
function InstallStep(props: {
  buildCount: number;
  token: string;
  framework: Framework;
  selectFramework: (id: Framework["id"]) => void;
}) {
  const { buildCount, token, framework, selectFramework } = props;
  const [forceOpen, setForceOpen] = useState(false);
  const status = buildCount === 0 ? "active" : "complete";
  const open = status === "active" || forceOpen;
  return (
    <Step
      number={1}
      status={status}
      title="Install Argos"
      aside={
        status === "complete" && (
          <span className="text-low text-sm">
            Set up with {framework.name} ·{" "}
            <TextLinkButton onPress={() => setForceOpen((open) => !open)}>
              {forceOpen ? "close" : "change"}
            </TextLinkButton>
          </span>
        )
      }
    >
      {open ? (
        <>
          <RadioGroup
            aria-label="Test framework"
            value={framework.id}
            onChange={(value) => {
              if (checkIsFrameworkId(value)) {
                selectFramework(value);
              }
            }}
            className="grid grid-cols-3 gap-2 sm:grid-cols-6"
          >
            {FRAMEWORKS.map((framework) => (
              <RadioField key={framework.id} value={framework.id}>
                <RadioButton className="data-selected:border-primary-active data-selected:bg-primary-subtle data-selected:text-primary hover:bg-hover data-focus-visible:ring-primary-active flex h-full cursor-default flex-col items-center gap-2 rounded-md border px-2 py-3 transition focus:outline-hidden data-focus-visible:ring-2">
                  {framework.logo}
                  <span className="text-xs">{framework.name}</span>
                </RadioButton>
              </RadioField>
            ))}
          </RadioGroup>
          <p className="text-low text-sm">
            Copy this prompt into your AI assistant (Claude Code, Cursor,
            Copilot…) — or follow the{" "}
            <Link href={framework.docsURL} target="_blank">
              {framework.name} quickstart
            </Link>{" "}
            to set it up yourself.
          </p>
          <Pre code={framework.getPrompt(token)} className="text-xs" />
        </>
      ) : null}
    </Step>
  );
}

/**
 * Step 2 — Run the tests to send a first build.
 */
function FirstBuildStep(props: {
  buildCount: number;
  build: Build | null;
  token: string;
  framework: Framework;
}) {
  const { buildCount, build, token, framework } = props;
  const status = buildCount === 0 ? "active" : "complete";
  return (
    <Step number={2} status={status} title="Send your first build">
      {status === "active" ? (
        <>
          <p className="text-low text-sm">
            {framework.requiresCIEnv ? (
              <>
                Run your tests with <Code>CI=true</Code> to simulate a CI
                environment, so screenshots are uploaded from your machine:
              </>
            ) : (
              <>Run your tests, then upload the captured screenshots:</>
            )}
          </p>
          <Pre code={framework.getCommand(token)} className="text-xs" />
          <p className="text-low text-sm">
            The <Code>ARGOS_TOKEN</Code> above authenticates your project. Keep
            it secret.
          </p>
          <Waiting>Waiting for your first build…</Waiting>
        </>
      ) : buildCount === 1 && build ? (
        <BuildCard build={build} />
      ) : null}
    </Step>
  );
}

/**
 * Step 3 — Send a second build to see how Argos compares builds.
 */
function DiffStep(props: {
  buildCount: number;
  build: Build | null;
  token: string;
  framework: Framework;
}) {
  const { buildCount, build, token, framework } = props;
  const status =
    buildCount === 0 ? "upcoming" : buildCount === 1 ? "active" : "complete";
  return (
    <Step number={3} status={status} title="See how diffs work">
      {status === "active" && build ? (
        <>
          <p className="text-low text-sm">{getFirstBuildDescription(build)}</p>
          <p className="text-low text-sm">
            Now change something visible in your UI — a color, a label — and run
            Argos again. Builds on the same branch and commit are compared with
            each other, so the new build is compared with this first one.
          </p>
          <Pre code={framework.getCommand(token)} className="text-xs" />
          <Waiting>Waiting for your next build…</Waiting>
        </>
      ) : null}
    </Step>
  );
}

function getFirstBuildDescription(build: Build) {
  switch (build.type) {
    case null:
    case undefined:
      return "Argos is processing your first build — screenshots are being received and analyzed.";
    case "reference":
      return "Your first build ran on an auto-approved branch: it has been approved automatically and serves as a baseline for future builds.";
    default:
      return (
        <>
          Your first build is an <strong>orphan</strong>: Argos had no previous
          build to compare it with, so every screenshot is new.
        </>
      );
  }
}

/**
 * Step 4 — Review the changes detected between the two builds.
 */
function ReviewStep(props: {
  buildCount: number;
  build: Build | null;
  framework: Framework;
  isLast?: boolean;
}) {
  const { buildCount, build, framework, isLast } = props;
  const status = buildCount >= 2 ? "active" : "upcoming";
  return (
    <Step
      number={4}
      status={status}
      title="Review your changes"
      isLast={isLast}
    >
      {status === "active" && build ? (
        <>
          <BuildCard build={build} />
          <p className="text-low text-sm">
            Argos compared this build with your first one and detected what
            changed. Approve or reject the changes — the same workflow you will
            use on every pull request.
          </p>
          <div>
            <ReviewBuildButton build={build} />
          </div>
          <p className="text-low text-sm">
            Next, run Argos in your CI so approved builds on your default branch
            become the{" "}
            <Link
              href="https://argos-ci.com/docs/learn/platform-fundamentals/baseline-build"
              target="_blank"
            >
              baseline
            </Link>{" "}
            every pull request is compared against. The{" "}
            <Link href={framework.docsURL} target="_blank">
              {framework.name} quickstart
            </Link>{" "}
            covers the CI setup.
          </p>
        </>
      ) : null}
    </Step>
  );
}

function ReviewBuildButton(props: { build: Build }) {
  const resolvedBuild = useResolvedPath(`builds/${props.build.number}`);
  return <LinkButton href={resolvedBuild.pathname}>Review build</LinkButton>;
}

function Step(props: {
  number: number;
  status: "complete" | "active" | "upcoming";
  title: string;
  aside?: React.ReactNode;
  isLast?: boolean;
  children?: React.ReactNode;
}) {
  const { number, status, title, aside, isLast, children } = props;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
      <div className="flex flex-col items-center">
        <div
          aria-hidden
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
            {
              complete: "bg-primary-solid text-white",
              active: "border-primary-active text-primary-low border-2",
              upcoming: "text-low border",
            }[status],
          )}
        >
          {status === "complete" ? <CheckIcon className="size-4" /> : number}
        </div>
        {!isLast && <div className="bg-ui my-1 w-px flex-1" />}
      </div>
      <div className={clsx("min-w-0", !isLast && "pb-10")}>
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2
            className={clsx(
              "font-semibold",
              status === "upcoming" && "text-low",
            )}
          >
            {title}
          </h2>
          {aside}
        </div>
        {children ? (
          <div className="mt-4 flex flex-col gap-4">{children}</div>
        ) : null}
      </div>
    </li>
  );
}

function BuildCard(props: { build: Build }) {
  const { build } = props;
  const resolvedBuild = useResolvedPath(`builds/${build.number}`);
  return (
    <HeadlessLink
      href={resolvedBuild.pathname}
      className="bg-app hover:bg-hover flex items-center gap-4 rounded-md border p-4 text-sm transition"
    >
      <span className="font-medium tabular-nums">{build.number}</span>
      <BuildStatusChip build={build} scale="sm" />
      <span className="text-low hidden min-w-0 items-center gap-3 text-xs sm:flex">
        {build.branch ? (
          <span className="flex min-w-0 items-center gap-1">
            <GitBranchIcon className="size-3 shrink-0" />
            <span className="truncate">{build.branch}</span>
          </span>
        ) : null}
        <span className="flex items-center gap-1">
          <GitCommitHorizontalIcon className="size-3 shrink-0" />
          {build.commit.slice(0, 7)}
        </span>
      </span>
      <span className="text-low ml-auto shrink-0 text-xs">
        <Time date={build.createdAt} />
      </span>
    </HeadlessLink>
  );
}

function Waiting(props: { children: React.ReactNode }) {
  return (
    <div className="text-low flex items-center gap-2.5 text-sm">
      <Loader className="size-5" delay={0} />
      {props.children}
    </div>
  );
}
