import { Helmet } from "react-helmet";
import { Link as RouterLink } from "react-router-dom";

import { Container } from "@/components";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/modern/ui/Alert";
import { Button } from "@/modern/ui/Button";

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
          <Button>
            {(buttonProps) => (
              <RouterLink to="/" {...buttonProps}>
                Back to home
              </RouterLink>
            )}
          </Button>
        </AlertActions>
      </Alert>
    </Container>
  );
};
