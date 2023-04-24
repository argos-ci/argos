import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { GitHubLoginButton } from "@/containers/GitHub";
import { Container } from "@/ui/Container";

export const Login = () => {
  const loggedIn = useIsLoggedIn();
  const [params] = useSearchParams();

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  const r = params.get("r");

  return (
    <>
      <Helmet>
        <title>Login</title>
      </Helmet>
      <Container className="mt-32 text-center">
        <h1 className="mb-10 text-4xl font-medium">Log in to Argos</h1>
        <GitHubLoginButton
          redirect={r}
          size="large"
          className="w-80 justify-center"
        >
          Continue with GitHub
        </GitHubLoginButton>
      </Container>
    </>
  );
};
