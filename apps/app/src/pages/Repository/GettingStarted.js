import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  Tag,
  Alert,
  Code,
} from "@argos-ci/app/src/components";
import { x } from "@xstyled/styled-components";
import { DocumentationPhrase } from "../../containers/DocumentationPhrase";
import { EnableToggleButton } from "./EnableToggleButton";

export function GettingStarted({ repository }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting started</CardTitle>
      </CardHeader>

      <CardBody>
        {!repository.enabled ? (
          <>
            <CardText fontSize="md">
              Activate repository to start visual testing on this project.
            </CardText>
            <EnableToggleButton repository={repository} mt={3} />
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

            <Code mt={2}>ARGOS_TOKEN={repository.token}</Code>

            <Alert mt={4} severity="warning">
              This token should be kept secret.
            </Alert>

            <CardText mt={4} fontWeight={400} fontSize="md">
              <DocumentationPhrase />
            </CardText>
          </x.div>
        )}
      </CardBody>
    </Card>
  );
}
