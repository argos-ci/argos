import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { LoginButtons } from "@/containers/LoginButtons";
import { BrandLogoVertical } from "@/ui/BrandLogoVertical";
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
        <BrandLogoVertical className="w-28 md:w-64" />

        <p className="my-8 text-lg font-medium md:text-xl">
          Ship flawless apps with Argos Visual Testing
        </p>

        <LoginButtons redirect={redirect} />
      </Container>
    </>
  );
};
