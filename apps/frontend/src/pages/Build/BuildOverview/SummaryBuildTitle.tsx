import { assertNever } from "@argos/util/assertNever";

import { DocumentType, graphql } from "@/gql";
import { BuildStatus, BuildType } from "@/gql/graphql";
import { getBuildDescriptor } from "@/util/build";

const _BuildFragment = graphql(`
  fragment SummaryBuildTitle_Build on Build {
    type
    status
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

function getBuildSummaryTitle(props: { build: Build; hasFailures: boolean }) {
  const descriptor = getBuildDescriptor(props.build.type, props.build.status);

  if (props.build.type === BuildType.Orphan) {
    return "No baseline yet";
  }

  // Failed tests take precedence over the visual outcome: the build can't be
  // trusted as a baseline regardless of the changes it contains.
  if (props.hasFailures) {
    return "Tests failed";
  }

  if (props.build.type === BuildType.Reference) {
    return "New baseline";
  }

  switch (props.build.status) {
    // The title describes what the build contains (visual changes). The review
    // outcome — approved/rejected/review required — is carried by the colored
    // status line below, so it stays out of the title to avoid redundancy.
    case BuildStatus.ChangesDetected:
    case BuildStatus.Accepted:
    case BuildStatus.Rejected:
      return "Visual changes detected";

    case BuildStatus.NoChanges:
      return "No changes detected";

    case BuildStatus.Aborted:
    case BuildStatus.Error:
    case BuildStatus.Expired:
    case BuildStatus.Pending:
    case BuildStatus.Progress:
      return descriptor.label;

    default:
      assertNever(props.build.status);
  }
}

export function SummaryBuildTitle(props: {
  build: Build;
  hasFailures: boolean;
}) {
  const title = getBuildSummaryTitle({
    build: props.build,
    hasFailures: props.hasFailures,
  });
  return <h1 className="text-3xl font-bold tracking-tight">{title}</h1>;
}
