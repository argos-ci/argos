import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { LoginButtons } from "@/containers/LoginButtons";
import { Container } from "@/ui/Container";

export const Login = () => {
  const loggedIn = useIsLoggedIn();
  const [params] = useSearchParams();

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  const redirect = params.get("r");

  return (
    <>
      <Helmet>
        <title>Login</title>
      </Helmet>
      <Container className="mt-32 flex flex-col items-center justify-center">
        <h1 className="mb-10 text-4xl font-medium">Log in to Argos</h1>
        <LoginButtons redirect={redirect} />
      </Container>
    </>
  );
};
