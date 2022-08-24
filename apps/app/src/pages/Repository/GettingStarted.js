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
              Active your repository to start using Argos.
            </CardText>
            <EnableToggleButton repository={repository} mt={2} />
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
