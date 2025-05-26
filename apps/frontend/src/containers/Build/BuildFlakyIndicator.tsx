import { useQuery } from "@apollo/client";
import clsx from "clsx";
import moment from "moment";
import { Link } from "react-router-dom";

import { graphql } from "@/gql";
import { Tooltip } from "@/ui/Tooltip";

import { FlakinessCircleIndicator } from "../Test/FlakinessCircleIndicator";

const TestQuery = graphql(`
  query BuildFlakyIndicator_Project(
    $accountSlug: String!
    $projectName: String!
    $testId: ID!
    $from: DateTime!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      test(id: $testId) {
        id
        metrics(input: { from: $from }) {
          all {
            total
            flakiness
          }
        }
      }
    }
  }
`);

const sevenDaysAgo = moment().subtract(7, "days").toDate();

export function BuildFlakyIndicator(props: {
  accountSlug: string;
  projectName: string;
  testId: string;
  className?: string;
}) {
  const { className, accountSlug, projectName, testId } = props;
  const { data, error } = useQuery(TestQuery, {
    variables: {
      accountSlug,
      projectName,
      testId,
      from: sevenDaysAgo.toISOString(),
    },
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return (
      <Tooltip content="Flaky test score is loading…">
        <FlakinessCircleIndicator
          className={clsx(className, "animate-pulse")}
          value={0}
          label="—"
          color="var(--text-color-low)"
        />
      </Tooltip>
    );
  }

  if (!data.project?.test) {
    return (
      <Tooltip content="Flaky test score is not available for this test.">
        <FlakinessCircleIndicator
          className={className}
          value={0}
          label="✕"
          color="var(--text-color-low)"
        />
      </Tooltip>
    );
  }

  const flakiness = data.project?.test?.metrics.all.flakiness ?? 0;

  return (
    <Tooltip
      disableHoverableContent={false}
      content={
        <div className="flex flex-col items-start gap-1">
          <p>Flaky test score (last 7 days).</p>
          <p>
            Based on {data.project.test.metrics.all.total} auto-approved builds.{" "}
            <Link
              to={`/${accountSlug}/${projectName}/tests/${data.project.test.id}`}
              className="underline decoration-1 underline-offset-2"
            >
              See details
            </Link>
          </p>
        </div>
      }
    >
      <FlakinessCircleIndicator className={className} value={flakiness} />
    </Tooltip>
  );
}
