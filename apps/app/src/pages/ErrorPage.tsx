import { Helmet } from "react-helmet";
import { Link as RouterLink } from "react-router-dom";

import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { Anchor } from "@/ui/Link";

export const ErrorPage = () => {
  return (
    <Container>
      <Helmet>
        <title>Error</title>
      </Helmet>
      <Alert>
        <AlertTitle>Sorry an error occurs.</AlertTitle>
        <AlertText>
          Something wrong happens, if the error persist, please reach us on{" "}
          <Anchor href="https://discord.gg/WjzGrQGS4A" external>
            Discord
          </Anchor>
          .
        </AlertText>
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
