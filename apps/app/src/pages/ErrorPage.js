import * as React from "react";
import { Helmet } from "react-helmet";
import { x } from "@xstyled/styled-components";
import { Container, Link } from "@argos-ci/app/src/components";

export function ErrorPage() {
  return (
    <Container textAlign="center" my={4}>
      <Helmet>
        <title>Error</title>
      </Helmet>

      <x.p fontSize="md">Sorry an error occurs.</x.p>
      <x.p mt={2}>
        <Link to="/">Back to home →</Link>
      </x.p>
    </Container>
  );
}
