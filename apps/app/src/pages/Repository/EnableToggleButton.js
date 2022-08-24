import React from "react";
import { Alert, Button } from "@argos-ci/app/src/components";
import { gql, useMutation } from "@apollo/client";

export function EnableToggleButton({ repository, ...props }) {
  const [toggleRepository, { loading, error }] = useMutation(gql`
    mutation toggleRepository($enabled: Boolean!, $repositoryId: String!) {
      toggleRepository(enabled: $enabled, repositoryId: $repositoryId)
    }
  `);

  return (
    <>
      <Button
        disabled={loading}
        variant={repository.enabled ? "danger" : "success"}
        onClick={() =>
          toggleRepository({
            variables: {
              enabled: !repository.enabled,
              repositoryId: repository.id,
            },
          })
        }
        {...props}
      >
        {repository.enabled ? "Deactivate" : "Activate"} Repository
      </Button>

      {error && (
        <Alert variant="danger">Something went wrong. Please try again.</Alert>
      )}
    </>
  );
}
