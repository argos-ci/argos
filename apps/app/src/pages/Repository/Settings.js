import React, { useState } from "react";
import { Boxer, Alert, Button, Input } from "@smooth-ui/core-sc";
import { Helmet } from "react-helmet";
import { gql } from "graphql-tag";
import {
  Container,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardText,
  Code,
  Link,
  InlineCode,
} from "../../components";
import { useRepository, useToggleRepository } from "./RepositoryContext";
import { Box } from "@xstyled/styled-components";
import { useMutation } from "@apollo/client";

const UPDATE_BASELINE_BRANCH = gql`
  mutation UpdateBaselineBranch($repositoryId: String!, $branchName: String!) {
    updateBaselineBranch(repositoryId: $repositoryId, branchName: $branchName) {
      id
      baselineBranch
    }
  }
`;

export function RepositorySettings() {
  const repository = useRepository();
  const { enabled } = repository;
  const { toggleRepository, loading, error } = useToggleRepository();

  const [baselineBranch, setBaselineBranch] = useState(
    repository.baselineBranch
  );

  const [
    updateBaselineBranch,
    { loading: baseBranchMutationLoading, error: baseBranchMutationError },
  ] = useMutation(UPDATE_BASELINE_BRANCH);

  return (
    <Container>
      <Helmet>
        <title>Settings</title>
      </Helmet>
      <Boxer my={4}>
        {enabled && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Argos Token</CardTitle>
              </CardHeader>
              <CardBody>
                <CardText fontSize={16}>
                  Use this <InlineCode>ARGOS_TOKEN</InlineCode> to authenticate
                  your repository when you send screenshots to Argos.
                </CardText>
                <Alert variant="warning">
                  This token should be kept secret.
                </Alert>
                <Code>ARGOS_TOKEN={repository.token}</Code>
                <CardText fontSize={16}>
                  Read our documentation for more information about
                  <Link target="_blank" href="https://docs.argos-ci.com">
                    installing
                  </Link>
                  Argos and
                  <Link target="_blank" href="https://docs.argos-ci.com/usage">
                    using it
                  </Link>
                  .
                </CardText>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reference branch</CardTitle>
              </CardHeader>
              <CardBody>
                <CardText fontSize={16}>
                  Argos will consider this branch as the reference for
                  screenshots comparison.
                </CardText>
                <Box fontSize={16} mb={1} fontWeight={600}>
                  Reference Branch
                </Box>
                <Box display="flex" gridGap={2}>
                  <Input
                    placeholder="Branch name"
                    border="base"
                    value={baselineBranch}
                    onChange={(e) => setBaselineBranch(e.target.value)}
                    maxWidth={400}
                  />
                  <Button
                    flex="0 0 auto"
                    disabled={baseBranchMutationLoading}
                    onClick={() => {
                      updateBaselineBranch({
                        variables: {
                          repositoryId: repository.id,
                          branchName: baselineBranch,
                        },
                      });
                    }}
                  >
                    Update Branch
                  </Button>
                </Box>
                {baseBranchMutationError && (
                  <Alert variant="danger">
                    Something went wrong. Please try again.
                  </Alert>
                )}
              </CardBody>
            </Card>
          </>
        )}

        <Card key="repository-activation">
          <CardHeader>
            <CardTitle>
              {enabled ? "Deactivate" : "Activate"} Repository
            </CardTitle>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert variant="danger">
                Something went wrong. Please try again.
              </Alert>
            )}

            <CardText>
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
            </CardText>
          </CardBody>
        </Card>
      </Boxer>
    </Container>
  );
}
