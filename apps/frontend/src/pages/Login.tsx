import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { LoginOptions } from "@/containers/LoginOptions";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { BrandShield } from "@/ui/BrandShield";
import { Container } from "@/ui/Container";
import { Link } from "@/ui/Link";
import { redirectToSAMLLogin } from "@/util/saml";

export function Component() {
  const loggedIn = useIsLoggedIn();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const samlTeamSlug = searchParams.get("saml");
  const redirect = searchParams.get("r") || null;
  const error = searchParams.get("error") || null;

  if (samlTeamSlug) {
    return <RedirectToSAMLLogin teamSlug={samlTeamSlug} redirect={redirect} />;
  }

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Login</title>
      </Helmet>

      <Container className="mt-12 flex max-w-sm flex-col items-center justify-center px-4">
        <BrandShield className="mb-6 w-28" />

        <h1 className="mb-10 text-3xl font-semibold">Login to Argos</h1>

        {error && (
          <Alert className="border-danger mb-8 rounded-sm border p-4">
            <AlertTitle>Sorry, an error occurred.</AlertTitle>
            <AlertText>
              <p>It seems we've some trouble to log you in.</p>
              <p className="text-default my-4 text-base">
                Error message: {error}
              </p>
              <p>
                Try again, if the error persists, please reach us on{" "}
                <Link href="https://argos-ci.com/discord" target="_blank">
                  Discord
                </Link>
                .
              </p>
            </AlertText>
          </Alert>
        )}

        <LoginOptions
          redirect={redirect}
          email={email}
          onEmailChange={setEmail}
          onSamlLogin={(teamSlug) => {
            redirectToSAMLLogin({ teamSlug, redirect, replace: false });
          }}
        />

        <p className="mt-8">
          Don’t have an account?{" "}
          <Link href={getSignupUrl({ email, redirect })}>Sign up</Link>
        </p>
      </Container>
    </>
  );
}

function RedirectToSAMLLogin(props: {
  teamSlug: string;
  redirect: string | null;
}) {
  const { teamSlug, redirect } = props;
  useEffect(() => {
    redirectToSAMLLogin({ teamSlug, redirect, replace: true });
  }, [teamSlug, redirect]);
  return null;
}

function getSignupUrl(props: {
  email: string | null;
  redirect: string | null;
}) {
  const searchParams = new URLSearchParams();
  const { email, redirect } = props;
  if (email) {
    searchParams.set("email", email);
  }
  if (redirect) {
    searchParams.set("r", redirect);
  }
  const strParams = searchParams.toString();
  return `/signup${strParams ? `?${strParams}` : ""}`;
}
