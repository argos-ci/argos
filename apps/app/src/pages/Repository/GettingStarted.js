import React from "react";
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
} from "../../components";
import { useRepository } from "./RepositoryContext";
import { ToggleButton } from "./ToggleButton";

export function GettingStarted() {
  const repository = useRepository();

  return (
    <Container my={4}>
      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        {!repository.enabled ? (
          <CardBody pt={0}>
            <p>To start, first activate your repository.</p>
            <ToggleButton />
          </CardBody>
        ) : (
          <CardBody py={0}>
            <p>
              You are ready to launch your first build, here is your Argos
              token:
            </p>
            <pre>
              <code>{repository.token}</code>
            </pre>
            <p>
              Follow <a href="https://docs.argos-ci.com">documentation</a> to
              know how to integrate quickly with frameworks.
            </p>
          </CardBody>
        )}
      </Card>
    </Container>
  );
}
