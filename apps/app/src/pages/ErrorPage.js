import { x } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";

import { Container, Link } from "@/components";

export function ErrorPage() {
  return (
    <Container textAlign="center" my={4}>
      <Helmet>
        <title>Error</title>
      </Helmet>

      <x.p fontSize="md">Sorry an error occurs.</x.p>
      <x.p mt={2}>
        <Link href="/">Back to home →</Link>
      </x.p>
    </Container>
  );
}
