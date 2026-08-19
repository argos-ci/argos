import { lazy, Suspense, useMemo } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { ArrowLeftIcon } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useParams } from "react-router";

import { graphql, type DocumentType } from "@/gql";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { PageLoader } from "@/ui/PageLoader";
import { RouterLink } from "@/ui/RouterLink";
import { Select, SelectButton } from "@/ui/Select";
import { Text } from "@/ui/Text";

import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "../Project/ProjectParams";
import { ProjectTitle } from "../Project/ProjectTitle";
import type { CanvasSegment } from "./FlowCanvas";
import {
  DIMENSION_LABELS,
  getValueLabel,
  getVariantOptions,
  matchesSelection,
  VARIANT_DIMENSIONS,
  type VariantDimension,
  type VariantSelection,
} from "./variants";

// The canvas pulls in a graph library and a stylesheet; the page is reachable
// from every section of the Flows tab, so it is not worth putting that in the
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
          screenCount
          segments {
            flow {
              id
              title
              file
            }
            steps {
              key
              name
              screenshots {
                id
                url
                metadata {
                  url
                  colorScheme
                  viewport {
                    width
                  }
                  browser {
                    name
                  }
                }
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
/**
 * A spec file's own name, without its directories or its extensions —
 * `e2e/logged/post-loan.spec.ts` reads as `post-loan`, which is what its author
 * called the thing it tests.
 */
function getJourneyTitle(file: string): string {
  const base = file.split("/").at(-1) ?? file;
  return base
    .replace(/\.(spec|test)\.[cm]?[jt]sx?$/, "")
    .replace(/\.[cm]?[jt]sx?$/, "");
}

function getPathname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return null;
  }
}

function VariantSelect(props: {
  dimension: VariantDimension;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { dimension, values, value, onChange } = props;
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const parsed = values.find((item) => item === next);
        if (parsed) {
          onChange(parsed);
        }
      }}
    >
      {/* The label goes on the trigger, not on the wrapper: a `div` with an
          `aria-label` exposes nothing, so the control would reach a screen
          reader unnamed. Its text still carries the chosen value. */}
      <SelectButton
        aria-label={DIMENSION_LABELS[dimension]}
        className="text-sm"
      >
        {getValueLabel(dimension, value)}
      </SelectButton>
      <ListBox>
        {values.map((item) => (
          <ListBoxItem key={item} value={item}>
            <ListBoxItemLabel>
              {getValueLabel(dimension, item)}
            </ListBoxItemLabel>
          </ListBoxItem>
        ))}
      </ListBox>
    </Select>
  );
}

/**
 * Split from the query so the hooks below never sit behind the "no such flow"
 * branch.
 */
function FlowJourney(props: { flow: Flow; params: ProjectParams }) {
  const { flow, params } = props;
  const { journey } = flow;

  const steps = useMemo(
    () => journey.segments.flatMap((segment) => segment.steps),
    [journey],
  );
  const options = useMemo(() => getVariantOptions(steps), [steps]);

  // The selection lives in the URL: this page exists to be sent to someone, and
  // a link that opens on the viewport the sender was looking at is the point.
  const [chosen, setChosen] = useQueryStates(
    {
      viewport: parseAsString,
      browser: parseAsString,
      theme: parseAsString,
    },
    { history: "replace" },
  );

  const selection = useMemo(() => {
    const result: VariantSelection = {};
    for (const dimension of VARIANT_DIMENSIONS) {
      const values = options[dimension];
      if (!values || values.length === 0) {
        continue;
      }
      // `getVariantOptions` sorts by coverage, so the head is the value that
      // leaves the fewest gaps.
      const [best] = values;
      invariant(best, "a listed dimension has at least one value");
      const wanted = chosen[dimension];
      result[dimension] = wanted && values.includes(wanted) ? wanted : best;
    }
    return result;
  }, [options, chosen]);

  const segments = useMemo<CanvasSegment[]>(
    () =>
      journey.segments.map((segment) => ({
        flowId: segment.flow.id,
        title: segment.flow.title,
        screens: segment.steps.map((step) => {
          const screenshot = step.screenshots.find((item) =>
            matchesSelection(item, selection),
          );
          return {
            // Keyed by the step within its test: two tests of one journey can
            // walk the same screen, and the canvas must not merge their nodes.
            id: `${segment.flow.id}:${step.key}`,
            name: step.name,
            capture: screenshot
              ? {
                  url: screenshot.url,
                  path: screenshot.metadata?.url
                    ? getPathname(screenshot.metadata.url)
                    : null,
                }
              : null,
          };
        }),
      })),
    [journey, selection],
  );

  const missingLabel = useMemo(() => {
    const parts = VARIANT_DIMENSIONS.map((dimension) => {
      const value = selection[dimension];
      return value ? getValueLabel(dimension, value) : null;
    }).filter((part) => part !== null);
    return parts.length > 0
      ? `Not captured at ${parts.join(" · ")}`
      : "Not captured";
  }, [selection]);

  // The journey names the page, not the test that happened to be clicked: the
  // reader came to see a path through the product. Its file makes a poor
  // heading in full, so the heading is the name the file was given and the path
  // stays in the line below, where it identifies without shouting.
  const title = getJourneyTitle(journey.name);
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
            {journey.screenCount} screen
            {journey.screenCount === 1 ? "" : "s"}
            {testCount > 1 ? ` across ${testCount} tests` : null} &#183;{" "}
            <span className="font-mono">{flow.file}</span>
          </Text>
        </PageHeaderContent>
        <PageHeaderActions>
          {VARIANT_DIMENSIONS.map((dimension) => {
            const values = options[dimension];
            const value = selection[dimension];
            if (!values || !value) {
              return null;
            }
            return (
              <VariantSelect
                key={dimension}
                dimension={dimension}
                values={values}
                value={value}
                onChange={(next) => setChosen({ [dimension]: next })}
              />
            );
          })}
        </PageHeaderActions>
      </PageHeader>

      {journey.screenCount === 0 ? (
        <Text slot="description">
          No test in this file takes a screenshot, so there is no flow to walk.
          Add an <code>argosScreenshot</code> call to see its screens here.
        </Text>
      ) : (
        <Suspense fallback={<PageLoader />}>
          <FlowCanvas segments={segments} missingLabel={missingLabel} />
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
