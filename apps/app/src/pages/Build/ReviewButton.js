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
  }
`;

export function ReviewButtonContent({ repository }) {
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
      <Button as={MenuButton} state={menu} alignSelf="end" disabled={loading}>
        Review changes
        <MenuButtonArrow state={menu} />
      </Button>
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

export function ReviewButton({ repository }) {
  return ["accepted", "rejected", "diffDetected"].includes(
    repository.build.status
  ) ? (
    <ReviewButtonContent repository={repository} />
  ) : null;
}