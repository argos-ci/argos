import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Container, FadeLink } from "@argos-ci/app/src/components";

export function ErrorPage() {
  return (
    <Container textAlign="center" my={4}>
      <Helmet>
        <title>Error</title>
      </Helmet>
      <p>Sorry an error occurs.</p>
      <p>
        <FadeLink as={Link} color="white" to="/">
          Back to home
        </FadeLink>
      </p>
    </Container>
  );
}
