import { lazy, Suspense, useMemo } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { ArrowLeftIcon } from "lucide-react";
import { useParams } from "react-router";

import { graphql, type DocumentType } from "@/gql";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";
import { RouterLink } from "@/ui/RouterLink";
import { Text } from "@/ui/Text";

import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "../Project/ProjectParams";
import { ProjectTitle } from "../Project/ProjectTitle";
import type { CanvasSegment } from "./FlowCanvas";

// The canvas pulls in a graph library and a stylesheet; the page is reachable
// from every row of the Flows tab, so it is not worth putting that in the
// bundle everyone downloads.
const FlowCanvas = lazy(() =>
  import("./FlowCanvas").then((module) => ({ default: module.FlowCanvas })),
);

const FlowQuery = graphql(`
  query FlowPage_project(
    $accountSlug: String!
    $projectName: String!
    $flowId: ID!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      flow(id: $flowId) {
        id
        title
        file
        journey {
          name
          screenshotCount
          segments {
            flow {
              id
              title
              file
            }
            screenshots {
              id
              name
              url
              width
              height
              metadata {
                url
              }
            }
          }
        }
      }
    }
  }
`);

type Flow = NonNullable<
  NonNullable<DocumentType<typeof FlowQuery>["project"]>["flow"]
>;

/**
 * The path a screenshot was taken on. The origin is noise here — every screen
 * of a run shares it — and a malformed URL is not worth failing a page over.
 */
function getPathname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return null;
  }
}

/**
 * The name a screen carries on the canvas: its own, with the journey folder
 * and the runner project taken off. Repeating `supplier-invoice/` above every
 * screen of the supplier-invoice journey says nothing.
 */
function getScreenLabel(name: string): string {
  const segments = name.split("/");
  return segments.at(-1) ?? name;
}

function useCanvasSegments(flow: Flow): CanvasSegment[] {
  return useMemo(
    () =>
      flow.journey.segments.map((segment) => ({
        flowId: segment.flow.id,
        title: segment.flow.title,
        screens: segment.screenshots.map((screenshot) => ({
          id: screenshot.id,
          name: getScreenLabel(screenshot.name),
          url: screenshot.url,
          width: screenshot.width ?? null,
          height: screenshot.height ?? null,
          path: screenshot.metadata?.url
            ? getPathname(screenshot.metadata.url)
            : null,
        })),
      })),
    [flow],
  );
}

/**
 * Split from the query so the hooks below never sit behind the "no such flow"
 * branch.
 */
function FlowJourney(props: { flow: Flow; params: ProjectParams }) {
  const { flow, params } = props;
  const segments = useCanvasSegments(flow);
  const { journey } = flow;
  // The journey names the page when it has one: the reader came to see a path
  // through the product, and the test that happened to be clicked is one step
  // of it.
  const title = journey.name ?? flow.title;
  const testCount = journey.segments.length;

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <RouterLink
            href={`/${params.accountSlug}/${params.projectName}/flows`}
            className="text-low mb-1 flex w-fit items-center gap-1.5 text-sm"
          >
            <ArrowLeftIcon className="size-4" />
            Flows
          </RouterLink>
          <Heading>{title}</Heading>
          <Text slot="headline">
            {journey.screenshotCount} screen
            {journey.screenshotCount === 1 ? "" : "s"}
            {testCount > 1 ? ` across ${testCount} tests` : null} &#183;{" "}
            <span className="font-mono">{flow.file}</span>
          </Text>
        </PageHeaderContent>
      </PageHeader>

      {journey.screenshotCount === 0 ? (
        <Text slot="description">
          This test takes no screenshot, so there is no journey to walk. Add an{" "}
          <code>argosScreenshot</code> call to see its screens here.
        </Text>
      ) : (
        <Suspense fallback={<PageLoader />}>
          <FlowCanvas segments={segments} />
        </Suspense>
      )}
    </PageContainer>
  );
}

function FlowContent(props: { params: ProjectParams; flowId: string }) {
  const { params, flowId } = props;
  const { data } = useSuspenseQuery(FlowQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      flowId,
    },
  });

  const flow = data.project?.flow;
  if (!flow) {
    return <NotFound />;
  }

  return <FlowJourney flow={flow} params={params} />;
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");
  const { flowId } = useParams();
  invariant(flowId, "flowId is a route param");

  return (
    <Page>
      <ProjectTitle params={params}>Flow</ProjectTitle>
      <FlowContent params={params} flowId={flowId} />
    </Page>
  );
}
