import React from "react";
import { Helmet } from "react-helmet";
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  Link,
} from "@argos-ci/app/src/components";

export function NotFound(props) {
  return (
    <Container {...props}>
      <Helmet>
        <title>Not found</title>
      </Helmet>
      <Card>
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
        </CardHeader>

        <CardBody textAlign="center">
          <CardText fontSize="md">There is nothing to see here.</CardText>
          <CardText fontSize="md" mt={2}>
            <Link to="/">Back to home →</Link>
          </CardText>
        </CardBody>
      </Card>
    </Container>
  );
}
