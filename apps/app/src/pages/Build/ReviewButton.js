/* eslint-disable react/no-unescaped-entities */
import { gql, useMutation } from "@apollo/client";
import { x } from "@xstyled/styled-components";

import {
  Alert,
  Button,
  HeadlessMenuButton,
  Icon,
  Menu,
  MenuButtonArrow,
  MenuItem,
  ParagraphTooltip,
  TooltipAnchor,
  useMenuState,
  useTooltipState,
} from "@argos-ci/app/src/components";

import { getBuildStatusIcon } from "../../containers/BuildStatus";
import { useUser } from "../../containers/User";
import { hasWritePermission } from "../../modules/permissions";

export const ReviewButtonBuildFragment = gql`
  fragment ReviewButtonBuildFragment on Build {
    id
    name
    status
    type
  }
`;

export const ReviewButtonRepositoryFragment = gql`
  fragment ReviewButtonRepositoryFragment on Repository {
    name
    permissions
    private
  }
`;

export const ReviewButtonOwnerFragment = gql`
  fragment ReviewButtonOwnerFragment on Owner {
    consumptionRatio
  }
`;

function ReviewButtonContent({ repository, disabled }) {
  const { id, status } = repository.build;
  let disabledButton = disabled;
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

  return (
    <x.div display="flex" flexDirection="column">
      <HeadlessMenuButton
        as={Button}
        state={menu}
        disabled={disabledButton || loading}
        alignSelf="end"
      >
        Review changes
        <MenuButtonArrow state={menu} />
      </HeadlessMenuButton>
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
          <Icon as={getBuildStatusIcon("accepted")} color="success" />
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
          <Icon as={getBuildStatusIcon("rejected")} color="danger" />
          Reject changes
        </MenuItem>
      </Menu>

      {error ? (
        <Alert color="danger" mt={2} w="fit-content" alignSelf="end">
          Something went wrong. Please try again.
        </Alert>
      ) : null}
    </x.div>
  );
}

function DisabledReviewButton({ repository, children }) {
  const tooltip = useTooltipState();

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <ReviewButtonContent repository={repository} disabled />
      </TooltipAnchor>
      <ParagraphTooltip state={tooltip} zIndex={200}>
        {children}
      </ParagraphTooltip>
    </>
  );
}

export function ReviewButton({ repository }) {
  const user = useUser();

  if (
    !user ||
    !["accepted", "rejected", "diffDetected"].includes(repository.build.status)
  ) {
    return null;
  }

  if (!hasWritePermission(repository)) {
    return (
      <DisabledReviewButton repository={repository}>
        You must have access to{" "}
        <x.span fontWeight="medium">
          {repository.name}/{repository.build.name}
        </x.span>{" "}
        repository on GitHub to review changes.
      </DisabledReviewButton>
    );
  }

  if (repository.private && repository.owner.consumptionRatio >= 1) {
    return (
      <DisabledReviewButton repository={repository}>
        You have hit 100% of your screenshots usage. Please upgrade to unlock
        build reviews.
      </DisabledReviewButton>
    );
  }

  return <ReviewButtonContent repository={repository} />;
}
