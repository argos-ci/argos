import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { LoginButtons } from "@/containers/LoginButtons";
import { BrandShield } from "@/ui/BrandShield";
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

      <Container className="mt-12 flex flex-col items-center justify-center px-4">
        <BrandShield className="mb-6 w-28" />

        <div className="mb-10 text-3xl">Login to Argos</div>

        <LoginButtons redirect={redirect} />
      </Container>
    </>
  );
};
