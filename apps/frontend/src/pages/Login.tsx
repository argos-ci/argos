import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { LoginButtons } from "@/containers/LoginButtons";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { Anchor } from "@/ui/Anchor";
import { BrandShield } from "@/ui/BrandShield";
import { Container } from "@/ui/Container";

export function Component() {
  const loggedIn = useIsLoggedIn();
  const [params] = useSearchParams();

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  const redirect = params.get("r");
  const error = params.get("error");

  return (
    <>
      <Helmet>
        <title>Login</title>
      </Helmet>

      <Container className="mt-12 flex flex-col items-center justify-center px-4">
        <BrandShield className="mb-6 w-28" />

        <div className="mb-10 text-3xl font-semibold">Login to Argos</div>

        {error && (
          <Alert className="border-danger mb-8 rounded border p-4">
            <AlertTitle>Sorry, an error occurred.</AlertTitle>
            <AlertText>
              <p>It seems we've some trouble to log you in.</p>
              <p className="text my-4 text-base">Error message: {error}</p>
              <p>
                Try again, if the error persists, please reach us on{" "}
                <Anchor href="https://argos-ci.com/discord" external>
                  Discord
                </Anchor>
                .
              </p>
            </AlertText>
          </Alert>
        )}

        <LoginButtons redirect={redirect} />
      </Container>
    </>
  );
}
