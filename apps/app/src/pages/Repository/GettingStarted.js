import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  Alert,
  Code,
  InlineCode,
} from "@argos-ci/app/src/components";
import { x } from "@xstyled/styled-components";
import { DocumentationPhrase } from "../../containers/DocumentationPhrase";

export function GettingStarted({ repository }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting started</CardTitle>
      </CardHeader>

      <CardBody>
        <x.div>
          <CardText fontSize="md">
            The repository is ready to receive the first build.
          </CardText>

          <CardText fontSize="md" mt={3}>
            Use this <InlineCode>ARGOS_TOKEN</InlineCode> to authenticate your
            repository when you send screenshots to Argos.
          </CardText>

          <Code mt={2}>ARGOS_TOKEN={repository.token}</Code>

          <Alert mt={4} color="warning">
            This token should be kept secret.
          </Alert>

          <CardText mt={4} fontWeight="normal" fontSize="md">
            <DocumentationPhrase />
          </CardText>
        </x.div>
      </CardBody>
    </Card>
  );
}
