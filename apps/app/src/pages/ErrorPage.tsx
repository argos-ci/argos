import { Helmet } from "react-helmet";

import { Link as RouterLink } from "react-router-dom";
import { Container } from "@/components";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/modern/ui/Alert";
import { Anchor } from "@/modern/ui/Link";
import { Button } from "@/modern/ui/Button";

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
          <Anchor
            href="https://discord.gg/WjzGrQGS4A"
            target="_blank"
            rel="noopener noreferrer"
          >
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
