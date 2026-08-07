import { invariant } from "@argos/util/invariant";
import { WaypointsIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Link } from "react-router";

import { BuildType } from "@/gql/graphql";
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

import { NotFound } from "../../NotFound";
import { useProjectParams, type ProjectParams } from "../ProjectParams";
import { ProjectTitle } from "../ProjectTitle";
import {
  getFlowURL,
  orderSteps,
  pickVariant,
  useProjectFlows,
  useStoredNames,
  useStoredOrders,
  type Flow,
} from "./util";

function FlowCard(props: {
  flow: Flow;
  params: ProjectParams;
  storedOrder: string[] | undefined;
  displayName: string;
}) {
  const { flow, params, storedOrder, displayName } = props;
  const cover = orderSteps(flow.steps, storedOrder)[0];
  invariant(cover, "a flow always has at least one step");
  const coverVariant = pickVariant(cover, null);
  return (
    <Link
      to={getFlowURL(params, flow.key)}
      className="group hover:border-hover flex flex-col overflow-hidden rounded-lg border transition hover:shadow-xs"
      data-flow-card={flow.key}
    >
      <div className="aspect-4/3 overflow-hidden border-b bg-white">
        <ImageKitPicture
          src={coverVariant.screenshot.url}
          transformations={["w-640", "h-640", "c-at_max"]}
          className="size-full object-contain"
          alt=""
        />
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        {flow.prefix && (
          <div className="text-low truncate font-mono text-xs">
            {flow.prefix} ›
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-sm font-medium">{displayName}</div>
          <div className="text-low shrink-0 text-xs">
            {flow.steps.length} step{flow.steps.length > 1 ? "s" : ""}
            {flow.variantLabels.length > 1
              ? ` · ${flow.variantLabels.length} variants`
              : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const { project, build, flows, ungroupedCount } = useProjectFlows(params);
  const { orders } = useStoredOrders(params);
  const { names } = useStoredNames(params);

  if (!project) {
    return <NotFound />;
  }

  if (!build || (flows.length === 0 && ungroupedCount === 0)) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIcon>
            <WaypointsIcon />
          </EmptyStateIcon>
          <Heading>No flows yet</Heading>
          <Text slot="description">
            A flow is a test that takes screenshots along a user journey —
            checkout, signup, onboarding. Flows appear automatically from your
            test structure as soon as a build has screenshots: nothing to
            configure.
          </Text>
        </EmptyState>
      </PageContainer>
    );
  }

  if (flows.length === 0) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIcon>
            <WaypointsIcon />
          </EmptyStateIcon>
          <Heading>No flow information in this build</Heading>
          <Text slot="description">
            Build #{build.number} has {ungroupedCount} screenshot
            {ungroupedCount > 1 ? "s" : ""}, but none carry test or story
            metadata, which Argos uses to derive flows automatically. Update the
            Argos SDK in your test suite to get flows without any configuration.
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
            Your product's user journeys, derived from your test suite, as
            captured on the{" "}
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
      <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
        {flows.map((flow) => (
          <FlowCard
            key={flow.key}
            flow={flow}
            params={params}
            storedOrder={orders[flow.key]}
            displayName={names[flow.key] ?? flow.title}
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
