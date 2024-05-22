import { Helmet } from "react-helmet";

import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { LinkButton } from "@/ui/Button";
import { Container } from "@/ui/Container";

export const NotFound = () => {
  return (
    <Container>
      <Helmet>
        <title>Page not found</title>
      </Helmet>
      <Alert>
        <AlertTitle>Page not found</AlertTitle>
        <AlertText>There is nothing to see here.</AlertText>
        <AlertActions>
          <LinkButton href="/">Back to home</LinkButton>
        </AlertActions>
      </Alert>
    </Container>
  );
};
