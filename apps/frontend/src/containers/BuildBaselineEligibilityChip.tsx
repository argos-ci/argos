import { DocumentType, graphql } from "@/gql";
import { BuildBaselineIneligibilityReason } from "@/gql/graphql";
import { Chip, ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";
import {
  getBaselineEligibilityDescriptor,
  getBaselineIneligibilityReasonLabel,
} from "@/util/build";

const _BuildFragment = graphql(`
  fragment BuildBaselineEligibilityChip_Build on Build {
    baselineEligibility {
      eligible
      reasons
    }
  }
`);

export function BuildBaselineEligibilityChip(props: {
  build: DocumentType<typeof _BuildFragment>;
  scale?: ChipProps["scale"];
}) {
  const { eligible, reasons } = props.build.baselineEligibility;

  // Eligibility cannot be determined until the build is complete: stay quiet
  // rather than showing a misleading "not eligible" chip.
  if (reasons.includes(BuildBaselineIneligibilityReason.BuildIncomplete)) {
    return null;
  }

  const descriptor = getBaselineEligibilityDescriptor(eligible);

  return (
    <Tooltip
      variant="info"
      content={
        <BaselineEligibilityDescription eligible={eligible} reasons={reasons} />
      }
    >
      <Chip
        className="shrink-0"
        icon={descriptor.icon}
        color={descriptor.color}
        scale={props.scale}
        aria-label={descriptor.label}
      />
    </Tooltip>
  );
}

function BaselineEligibilityDescription(props: {
  eligible: boolean;
  reasons: BuildBaselineIneligibilityReason[];
}) {
  const descriptor = getBaselineEligibilityDescriptor(props.eligible);
  if (props.eligible) {
    return <>{descriptor.description}</>;
  }
  return (
    <div className="flex flex-col gap-1">
      <div>{descriptor.description}</div>
      <ul className="list-disc pl-4">
        {props.reasons.map((reason) => (
          <li key={reason}>{getBaselineIneligibilityReasonLabel(reason)}</li>
        ))}
      </ul>
    </div>
  );
}
