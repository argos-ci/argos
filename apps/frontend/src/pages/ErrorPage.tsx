import { Helmet } from "react-helmet";
import { Link as RouterLink } from "react-router-dom";

import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Anchor } from "@/ui/Anchor";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";

export const ErrorPage = () => {
  return (
    <Container className="py-10">
      <Helmet>
        <title>Error</title>
      </Helmet>
      <Alert>
        <AlertTitle>Sorry, an error occurred</AlertTitle>
        <AlertText>
          Something went wrong. If the error persists, please reach us on{" "}
          <Anchor href="https://argos-ci.com/discord" external>
            Discord
          </Anchor>
          .
        </AlertText>
        <AlertActions>
          <Button asChild>
            <RouterLink to="/">Back to home</RouterLink>
          </Button>
        </AlertActions>
      </Alert>
    </Container>
  );
};
