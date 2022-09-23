import * as React from "react";
import { x } from "@xstyled/styled-components";
import {
  Alert,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  useMenuState,
  MenuButtonArrow,
  useTooltipState,
  TooltipAnchor,
  Tooltip,
} from "@argos-ci/app/src/components";
import { gql, useMutation } from "@apollo/client";
import { StatusIcon } from "../../containers/Status";
import { hasWritePermission } from "../../modules/permissions";

export const ReviewButtonBuildFragment = gql`
  fragment ReviewButtonBuildFragment on Build {
    id
    status
    type
  }
`;

export const ReviewButtonRepositoryFragment = gql`
  fragment ReviewButtonRepositoryFragment on Repository {
    permissions
    private
  }
`;

export const ReviewButtonOwnerFragment = gql`
  fragment ReviewButtonOwnerFragment on Owner {
    consumptionRatio
  }
`;

export function ReviewButtonContent({ repository, disabled }) {
  const { id, status } = repository.build;
  const menu = useMenuState({ placement: "bottom-end", gutter: 4 });
  const [setValidationStatus, { loading, error }] = useMutation(gql`
    mutation setValidationStatus(
      $buildId: ID!
      $validationStatus: ValidationStatus!
    ) {
      setValidationStatus(
        buildId: $buildId
        validationStatus: $validationStatus
      ) {
        id
        ...ReviewButtonBuildFragment
      }
    }

    ${ReviewButtonBuildFragment}
  `);

  if (!hasWritePermission(repository)) {
    return null;
  }

  return (
    <x.div display="flex" flexDirection="column" flex={1}>
      <MenuButton
        as={Button}
        state={menu}
        disabled={disabled || loading}
        alignSelf="end"
      >
        Review changes
        <MenuButtonArrow state={menu} />
      </MenuButton>
      <Menu aria-label="Review changes" state={menu}>
        <MenuItem
          state={menu}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setValidationStatus({
              variables: { buildId: id, validationStatus: "accepted" },
            });
            menu.hide();
          }}
          disabled={status === "accepted"}
        >
          <StatusIcon status="accepted" />
          Approve changes
        </MenuItem>
        <MenuItem
          state={menu}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setValidationStatus({
              variables: { buildId: id, validationStatus: "rejected" },
            });
            menu.hide();
          }}
          disabled={status === "rejected"}
        >
          <StatusIcon status="rejected" />
          Reject changes
        </MenuItem>
      </Menu>

      {error ? (
        <Alert severity="error" mt={2} w="fit-content" alignSelf="end">
          Something went wrong. Please try again.
        </Alert>
      ) : null}
    </x.div>
  );
}

function DisabledReviewButton({ repository }) {
  const tooltip = useTooltipState();

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <ReviewButtonContent repository={repository} disabled />
      </TooltipAnchor>
      <Tooltip state={tooltip}>
        You have hit 100% of your screenshots usage. Please upgrade to unlock
        build reviews.
      </Tooltip>
    </>
  );
}

export function ReviewButton({ repository }) {
  if (
    !["accepted", "rejected", "diffDetected"].includes(repository.build.status)
  ) {
    return null;
  }

  if (repository.private && repository.owner.consumptionRatio >= 1) {
    return <DisabledReviewButton repository={repository} />;
  }

  return <ReviewButtonContent repository={repository} />;
}
