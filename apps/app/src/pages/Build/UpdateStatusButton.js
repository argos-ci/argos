import * as React from "react";
import { x } from "@xstyled/styled-components";
import {
  Alert,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  useMenuState,
} from "@argos-ci/app/src/components";
import { gql, useMutation } from "@apollo/client";
import { StatusIcon } from "../../containers/Status";
import { hasWritePermission } from "../../modules/permissions";

export const UpdateStatusButtonBuildFragment = gql`
  fragment UpdateStatusButtonBuildFragment on Build {
    id
    status
  }
`;

export const UpdateStatusButtonRepositoryFragment = gql`
  fragment UpdateStatusButtonRepositoryFragment on Repository {
    permissions
  }
`;

export function UpdateStatusButton({ repository, build: { id, status } }) {
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
        ...UpdateStatusButtonBuildFragment
      }
    }

    ${UpdateStatusButtonBuildFragment}
  `);

  if (!hasWritePermission(repository)) {
    return null;
  }

  return (
    <x.div display="flex" flexDirection="column" flex={1}>
      <Button as={MenuButton} state={menu} alignSelf="end" disabled={loading}>
        Review changes
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
