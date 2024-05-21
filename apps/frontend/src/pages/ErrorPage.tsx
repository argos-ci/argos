import { Helmet } from "react-helmet";

import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { LinkButton } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { Link } from "@/ui/Link";

export function ErrorPage() {
  return (
    <Container className="py-10">
      <Helmet>
        <title>Error</title>
      </Helmet>
      <Alert>
        <AlertTitle>Sorry, an error occurred</AlertTitle>
        <AlertText>
          Something went wrong. If the error persists, please reach us on{" "}
          <Link href="https://argos-ci.com/discord" target="_blank">
            Discord
          </Link>
          .
        </AlertText>
        <AlertActions>
          <LinkButton href="/">Back to home</LinkButton>
        </AlertActions>
      </Alert>
    </Container>
  );
}
