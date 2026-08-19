import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useParams } from "react-router";

import { graphql, type DocumentType } from "@/gql";
import { Heading } from "@/ui/Heading";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { RouterLink } from "@/ui/RouterLink";
import { Text } from "@/ui/Text";

import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "../Project/ProjectParams";
import { ProjectTitle } from "../Project/ProjectTitle";

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
`);

type Flow = NonNullable<
  NonNullable<DocumentType<typeof FlowQuery>["project"]>["flow"]
>;
type Screen = Flow["screenshots"][number];

/**
 * Width of a screen in the strip. Big enough to recognize the page at a
 * glance, which is the whole point of the page: it is read by someone who
 * wants to see the product, not the test.
 */
const SCREEN_WIDTH = 304;

/**
 * A long page would otherwise turn the strip into a wall: the top of a screen
 * is what makes it recognizable, so tall ones are cropped rather than shrunk
 * to a sliver.
 */
const SCREEN_MAX_HEIGHT = 380;

function Screen(props: { screen: Screen }) {
  const { screen } = props;
  const path = screen.metadata?.url ? getPathname(screen.metadata.url) : null;

  return (
    <figure className="m-0 shrink-0" style={{ width: SCREEN_WIDTH }}>
      <div
        className="bg-app overflow-hidden rounded-lg border shadow-md"
        style={{ maxHeight: SCREEN_MAX_HEIGHT }}
      >
        <ImageKitPicture
          src={screen.url}
          alt={screen.name}
          className="block w-full"
          style={{
            aspectRatio:
              screen.width && screen.height
                ? `${screen.width} / ${screen.height}`
                : undefined,
          }}
          transformations={[`w-${SCREEN_WIDTH * 2}`]}
        />
      </div>
      <figcaption className="flex flex-wrap items-baseline gap-x-2 pt-3">
        <span className="font-mono text-sm font-medium">{screen.name}</span>
        {path ? <span className="text-low text-xs">{path}</span> : null}
      </figcaption>
    </figure>
  );
}

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

  const screens = flow.screenshots;

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
          <Heading>{flow.title}</Heading>
          <Text slot="headline">
            {screens.length} screen{screens.length === 1 ? "" : "s"} ·{" "}
            <span className="font-mono">{flow.file}</span>
          </Text>
        </PageHeaderContent>
      </PageHeader>

      {screens.length === 0 ? (
        <Text slot="description">
          This test takes no screenshot, so there is no journey to walk. Add an{" "}
          <code>argosScreenshot</code> call to see its screens here.
        </Text>
      ) : (
        // A single straight lane: one test, its screens in capture order. It
        // scrolls sideways inside its own container so the page itself never
        // does.
        <div className="-mx-4 flex items-start gap-0 overflow-x-auto px-4 pb-4">
          {screens.map((screen, index) => (
            <div key={screen.id} className="flex items-start">
              {index > 0 ? (
                <div
                  className="text-low flex shrink-0 justify-center"
                  style={{ width: 46, paddingTop: 90 }}
                >
                  <ArrowRightIcon className="size-5" />
                </div>
              ) : null}
              <Screen screen={screen} />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
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
