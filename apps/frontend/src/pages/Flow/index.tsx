import { useMemo } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { CameraIcon, RouteIcon, WaypointsIcon } from "lucide-react";
import { Link } from "react-router";

import { graphql, type DocumentType } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Heading } from "@/ui/Heading";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateLearnMore,
  EmptyStateStep,
  EmptyStateSteps,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Text } from "@/ui/Text";
import { Time } from "@/ui/Time";
import {
  getJourneyDims,
  getVariantDims,
  groupJourneys,
  type Journey,
} from "@/util/flow-model";

import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "../Project/ProjectParams";
import { ProjectTitle } from "../Project/ProjectTitle";
import { getFlowURL } from "./FlowParams";

const _BuildFragment = graphql(`
  fragment FlowsPage_Build on Build {
    id
    number
    branch
    createdAt
    type
    screenshotDiffs(after: 0, first: 1000) {
      pageInfo {
        hasNextPage
      }
      edges {
        id
        variantKey
        parentName
        compareScreenshot {
          id
          url
          contentType
          metadata {
            viewport {
              width
            }
            browser {
              name
            }
            colorScheme
            test {
              titlePath
            }
            story {
              id
            }
            capture {
              index
            }
          }
        }
      }
    }
  }
`);

const ProjectQuery = graphql(`
  query FlowsPage_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      latestAutoApprovedBuild {
        id
        ...FlowsPage_Build
      }
      latestBuild {
        id
        ...FlowsPage_Build
      }
    }
  }
`);

type FlowsBuild = DocumentType<typeof _BuildFragment>;
type Edge = FlowsBuild["screenshotDiffs"]["edges"][number];
type Screen = Edge & {
  compareScreenshot: NonNullable<Edge["compareScreenshot"]>;
};

const DOCS_URL =
  "https://argos-ci.com/docs/learn/review-workflow/review-a-build#review-a-journey-in-order";

function FlowCard(props: {
  journey: Journey<Screen>;
  params: ProjectParams;
  buildNumber: number;
}) {
  const { journey, params, buildNumber } = props;
  const cover = journey.steps[0]?.diffs[0];
  invariant(cover, "a journey always has at least one step");
  const variants = getJourneyDims(
    journey.steps.flatMap((step) =>
      step.diffs.map((screen) =>
        getVariantDims(screen.compareScreenshot.metadata),
      ),
    ),
  );
  const variantCount = Math.max(
    variants.browsers.length,
    variants.viewports.length,
    variants.schemes.length,
  );
  return (
    <Link
      to={getFlowURL(params, journey.identity.key, { build: buildNumber })}
      className="group hover:border-hover flex flex-col overflow-hidden rounded-lg border transition hover:shadow-xs"
      data-flow-card={journey.identity.key}
    >
      {/* Cropped from the top, like the steps of the minimap: fitting a
          full-page capture into the card would leave a sliver of image lost in
          white, exactly where the cover has to carry the recognition. */}
      <div className="aspect-4/3 overflow-hidden border-b bg-white">
        <ImageKitPicture
          src={cover.compareScreenshot.url}
          transformations={["w-640", "h-480", "fo-top"]}
          className="size-full object-cover object-top"
          alt=""
        />
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        {journey.identity.prefix && (
          <div className="text-low truncate font-mono text-xs">
            {journey.identity.prefix} ›
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-sm font-medium">
            {journey.identity.title}
          </div>
          <div className="text-low shrink-0 text-xs">
            {journey.steps.length} steps
            {variantCount > 1 ? ` · ${variantCount} variants` : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}

function NoFlowsYet() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <WaypointsIcon />
      </EmptyStateIcon>
      <Heading>No flows yet</Heading>
      <Text slot="description">
        A flow is the journey a test walks — checkout, signup, onboarding — read
        from the screenshots it takes along the way. Flows appear on their own
        from your test structure, as soon as a build has screenshots: nothing to
        configure.
      </Text>
      <EmptyStateLearnMore href={DOCS_URL} />
      <EmptyStateSteps>
        <EmptyStateStep
          icon={<RouteIcon />}
          step="In your suite"
          title="Walk a journey in one test"
        >
          One test per journey: the test's name becomes the flow's name, and
          each screenshot it takes along the way is a step.
        </EmptyStateStep>
        <EmptyStateStep
          icon={<CameraIcon />}
          step="At each step"
          title="Take a screenshot"
        >
          Name it after the screen — cart, shipping, payment. The Argos SDK
          records the order, so the flow reads as the test walked it.
        </EmptyStateStep>
      </EmptyStateSteps>
    </EmptyState>
  );
}

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const {
    data: { project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });
  const build =
    project?.latestAutoApprovedBuild ?? project?.latestBuild ?? null;
  const screens = useMemo(
    () =>
      (build?.screenshotDiffs.edges ?? []).filter(
        // ARIA snapshots and other child screenshots (`parentName`) are
        // companions of a snapshot, not steps of the journey.
        (edge): edge is Screen =>
          edge.parentName === null && edge.compareScreenshot !== null,
      ),
    [build],
  );
  const journeys = useMemo(
    () =>
      groupJourneys(screens, (screen) => ({
        variantKey: screen.variantKey,
        metadata: screen.compareScreenshot.metadata,
      })),
    [screens],
  );

  if (!project) {
    return <NotFound />;
  }

  if (!build || screens.length === 0) {
    return (
      <PageContainer>
        <NoFlowsYet />
      </PageContainer>
    );
  }

  if (journeys.length === 0) {
    const hasMetadata = screens.some(
      (screen) =>
        screen.compareScreenshot.metadata?.test ||
        screen.compareScreenshot.metadata?.story,
    );
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIcon>
            <WaypointsIcon />
          </EmptyStateIcon>
          {hasMetadata ? (
            <>
              <Heading>No journeys in this build</Heading>
              <Text slot="description">
                Build #{build.number} has {screens.length} screenshots, but each
                test captures a single screen — that's regular visual testing. A
                flow appears as soon as a test takes several screenshots along a
                journey: checkout, signup, onboarding.
              </Text>
            </>
          ) : (
            <>
              <Heading>No flow information in this build</Heading>
              <Text slot="description">
                Build #{build.number} has {screens.length} screenshots, but none
                carry the test metadata Argos reads journeys from. Update the
                Argos SDK in your test suite to get flows with nothing to
                configure.
              </Text>
            </>
          )}
          <EmptyStateLearnMore href={DOCS_URL} />
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
            Your product's journeys, as your tests walk them, captured on the{" "}
            {build.type === BuildType.Reference
              ? "latest reference build"
              : "latest build"}
            .
          </Text>
        </PageHeaderContent>
        <Chip scale="sm" className="self-start">
          From build #{build.number} on {build.branch} ·{" "}
          <Time date={build.createdAt} />
        </Chip>
      </PageHeader>
      {build.screenshotDiffs.pageInfo.hasNextPage ? (
        <div className="text-low mb-4 text-xs">
          Flows are read from the first 1000 screenshots of the build.
        </div>
      ) : null}
      <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
        {journeys.map((journey) => (
          <FlowCard
            key={journey.identity.key}
            journey={journey}
            params={params}
            buildNumber={build.number}
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
