import { Helmet } from "react-helmet";
import { Link as RouterLink } from "react-router-dom";

import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
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
          <Button asChild>
            <RouterLink to="/">Back to home</RouterLink>
          </Button>
        </AlertActions>
      </Alert>
    </Container>
  );
};
