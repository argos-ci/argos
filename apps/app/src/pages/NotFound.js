import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  FadeLink,
} from "@argos-ci/app/src/components";

export function NotFound(props) {
  return (
    <Container textAlign="center" my={4} {...props}>
      <Helmet>
        <title>Not found</title>
      </Helmet>
      <Card>
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
        </CardHeader>
        <CardBody>
          <CardText>There is nothing to see here.</CardText>
          <CardText>
            <FadeLink as={Link} color="white" to="/">
              Back to home
            </FadeLink>
          </CardText>
        </CardBody>
      </Card>
    </Container>
  );
}
