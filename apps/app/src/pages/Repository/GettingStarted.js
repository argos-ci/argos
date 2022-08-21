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
  DocumentationLinkPhrase,
} from "@argos-ci/app/src/components";
import { x } from "@xstyled/styled-components";
import { useRepository } from "../../containers/RepositoryContext";
import { EnableRepositoryToggleButton } from "../../containers/EnableRepositoryToggleButton";

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
            <CardText>To start, first activate your repository.</CardText>
            <EnableRepositoryToggleButton />
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
              <DocumentationLinkPhrase />
            </CardText>
          </x.div>
        )}
      </CardBody>
    </Card>
  );
}
