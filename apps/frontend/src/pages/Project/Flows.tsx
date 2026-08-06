import { useMemo } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { ChevronRightIcon, WaypointsIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Link } from "react-router";

import { graphql, type DocumentType } from "@/gql";
import { Chip } from "@/ui/Chip";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import {
  EmptyState,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Time } from "@/ui/Time";

import { getBuildURL } from "../Build/BuildParams";
import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const ProjectFlowsQuery = graphql(`
  query ProjectFlows_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      latestAutoApprovedBuild {
        id
        number
        branch
        createdAt
        screenshotDiffs(after: 0, first: 100) {
          edges {
            id
            compareScreenshot {
              id
              name
              url
              width
              height
              contentType
              metadata {
                flow {
                  name
                  step
                  index
                }
              }
            }
          }
        }
      }
    }
  }
`);

type ProjectFlowsDocument = DocumentType<typeof ProjectFlowsQuery>;
type ReferenceBuild = NonNullable<
  NonNullable<ProjectFlowsDocument["project"]>["latestAutoApprovedBuild"]
>;
type DiffEdge = ReferenceBuild["screenshotDiffs"]["edges"][0];

type FlowStep = {
  edge: DiffEdge;
  screenshot: NonNullable<DiffEdge["compareScreenshot"]>;
  flow: NonNullable<
    NonNullable<NonNullable<DiffEdge["compareScreenshot"]>["metadata"]>["flow"]
  >;
};

type Flow = {
  name: string;
  steps: FlowStep[];
};

function groupFlows(edges: DiffEdge[]): Flow[] {
  const byName = new Map<string, FlowStep[]>();
  for (const edge of edges) {
    const screenshot = edge.compareScreenshot;
    const flow = screenshot?.metadata?.flow;
    if (!screenshot || !flow) {
      continue;
    }
    const steps = byName.get(flow.name) ?? [];
    byName.set(flow.name, steps);
    steps.push({ edge, screenshot, flow });
  }
  return Array.from(byName, ([name, steps]) => ({
    name,
    steps: steps.toSorted(
      (a, b) =>
        (a.flow.index ?? Number.MAX_SAFE_INTEGER) -
        (b.flow.index ?? Number.MAX_SAFE_INTEGER),
    ),
  })).toSorted((a, b) => a.name.localeCompare(b.name));
}

function FlowSection(props: {
  flow: Flow;
  build: ReferenceBuild;
  params: ProjectParams;
}) {
  const { flow, build, params } = props;
  return (
    <section className="rounded-lg border">
      <div className="flex items-baseline gap-2 border-b p-4">
        <h2 className="text-base font-medium">{flow.name}</h2>
        <span className="text-low text-sm">
          {flow.steps.length} step{flow.steps.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto p-4">
        {flow.steps.map((step, index) => (
          <div key={step.edge.id} className="flex shrink-0 items-center gap-2">
            {index > 0 && (
              <ChevronRightIcon className="text-low size-4 shrink-0" />
            )}
            <Link
              to={getBuildURL({
                accountSlug: params.accountSlug,
                projectName: params.projectName,
                buildNumber: build.number,
                diffId: step.edge.id,
              })}
              className="group w-56"
            >
              <div className="group-hover:border-hover aspect-4/3 overflow-hidden rounded-md border bg-white transition">
                <ImageKitPicture
                  src={step.screenshot.url}
                  transformations={["w-448", "h-448", "c-at_max"]}
                  className="size-full object-contain"
                  alt={step.flow.step ?? step.screenshot.name}
                />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 px-0.5">
                <span className="text-low text-xs tabular-nums">
                  {step.flow.index ?? index + 1}
                </span>
                <span className="truncate text-sm font-medium">
                  {step.flow.step ?? step.screenshot.name}
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const {
    data: { project },
  } = useSuspenseQuery(ProjectFlowsQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });

  const build = project?.latestAutoApprovedBuild ?? null;
  const edges = useMemo(() => build?.screenshotDiffs.edges ?? [], [build]);
  const flows = useMemo(() => groupFlows(edges), [edges]);

  if (!project) {
    return <NotFound />;
  }

  if (!build || flows.length === 0) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIcon>
            <WaypointsIcon />
          </EmptyStateIcon>
          <Heading>No flows yet</Heading>
          <Text slot="description">
            A flow is a user journey — checkout, signup, onboarding — captured
            step by step by your E2E tests. Pass a{" "}
            <code>{`flow: { name, step, index }`}</code> option to your Argos
            screenshots and the journey shows up here, always up to date with
            your reference builds.
          </Text>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Flows</Heading>
          <Text slot="headline">
            Your product's user journeys, step by step, as captured on the
            latest reference build.
          </Text>
        </PageHeaderContent>
        <Chip scale="sm" className="self-start">
          From build #{build.number} on {build.branch} ·{" "}
          <Time date={build.createdAt} />
        </Chip>
      </PageHeader>
      <div className="mb-8 flex flex-col gap-6">
        {flows.map((flow) => (
          <FlowSection
            key={flow.name}
            flow={flow}
            build={build}
            params={params}
          />
        ))}
      </div>
    </PageContainer>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");

  return (
    <Page>
      <ProjectTitle params={params}>Flows</ProjectTitle>
      <PageContent params={params} />
    </Page>
  );
}
