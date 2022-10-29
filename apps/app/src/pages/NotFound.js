import { Helmet } from "react-helmet";
import { x } from "@xstyled/styled-components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  Link,
  Container,
} from "@argos-ci/app/src/components";

export function NotFound(props) {
  return (
    <x.div {...props}>
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
    </x.div>
  );
}

export function NotFoundWithContainer(props) {
  return (
    <Container>
      <NotFound {...props} />
    </Container>
  );
}
