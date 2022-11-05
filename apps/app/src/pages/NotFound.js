import { x } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";

import {
  Card,
  CardBody,
  CardHeader,
  CardText,
  CardTitle,
  Container,
  Link,
} from "@/components";

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
