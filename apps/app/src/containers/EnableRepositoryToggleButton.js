import React from "react";
import { Button } from "@argos-ci/app/src/components";
import { useRepository, useToggleRepository } from "./RepositoryContext";

export function EnableRepositoryToggleButton() {
  const { repository } = useRepository();
  const { toggleRepository, loading } = useToggleRepository();
  const { enabled } = repository;
  return (
    <Button
      disabled={loading}
      variant={enabled ? "danger" : "success"}
      onClick={() =>
        toggleRepository({
          variables: {
            enabled: !repository.enabled,
            repositoryId: repository.id,
          },
        })
      }
    >
      {enabled ? "Deactivate" : "Activate"} Repository
    </Button>
  );
}
