import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  Tag,
  Alert,
  Code,
  Button,
} from "@argos-ci/app/src/components";
import { x } from "@xstyled/styled-components";
import {
  useRepository,
  useToggleRepository,
} from "../../containers/RepositoryContext";
import { DocumentationPhrase } from "../../containers/DocumentationPhrase";

function EnableToggleButton(props) {
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
      {...props}
    >
      {enabled ? "Deactivate" : "Activate"} Repository
    </Button>
  );
}

export function GettingStarted() {
  const { repository } = useRepository();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting started</CardTitle>
      </CardHeader>

      <CardBody>
        {!repository.enabled ? (
          <>
            <CardText fontSize="md">
              Active your repository to start using Argos.
            </CardText>
            <EnableToggleButton mt={2} />
          </>
        ) : (
          <x.div>
            <CardText fontSize="md">
              The repository is activated and ready to receive the first build.
            </CardText>

            <CardText fontSize="md" mt={3}>
              Use this <Tag>ARGOS_TOKEN</Tag> to authenticate your repository
              when you send screenshots to Argos.
            </CardText>

            <Alert mt={4}>This token should be kept secret.</Alert>

            <Code mt={2}>ARGOS_TOKEN={repository.token}</Code>

            <CardText mt={4} fontWeight={400} fontSize="md">
              <DocumentationPhrase />
            </CardText>
          </x.div>
        )}
      </CardBody>
    </Card>
  );
}
