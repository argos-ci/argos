import { DocumentType, graphql } from "@/gql";
import { TestReportStatus } from "@/gql/graphql";
import { Chip, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";
import { getTestReportStatusDescriptor } from "@/util/build";

const _BuildFragment = graphql(`
  fragment BuildTestStatusChip_Build on Build {
    metadata {
      testReport {
        status
      }
    }
  }
`);

export function BuildTestStatusChip(props: {
  build: DocumentType<typeof _BuildFragment>;
  scale?: ChipProps["scale"];
}) {
  const { build } = props;
  if (!build.metadata?.testReport) {
    return null;
  }

  if (build.metadata.testReport.status === TestReportStatus.Passed) {
    return null;
  }

  const descriptor = getTestReportStatusDescriptor(
    build.metadata.testReport.status,
  );
  return (
    <Tooltip variant="info" content={descriptor.description}>
      <Chip icon={descriptor.icon} color={descriptor.color} scale={props.scale}>
        Tests {descriptor.label.toLowerCase()}
      </Chip>
    </Tooltip>
  );
}
