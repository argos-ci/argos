import { ErrorBoundary } from "react-error-boundary";

import { useAuthTokenPayload } from "@/containers/Auth";
import { LoginButtons } from "@/containers/LoginButtons";
import { RetrieveToken } from "@/containers/Vercel/RetrieveToken";
import { BrandLogo } from "@/ui/BrandLogo";
import { Container } from "@/ui/Container";

export const VercelCallback = () => {
  const payload = useAuthTokenPayload();
  return (
    <Container className="flex h-screen flex-col items-center py-4">
      <BrandLogo height={40} className="mb-6 max-w-none" />
      <ErrorBoundary
        fallback={
          <div className="text-xl">Error while installing, please retry.</div>
        }
      >
        {payload ? (
          <RetrieveToken authUserAccount={payload.account} />
        ) : (
          <div style={{ maxWidth: 400 }}>
            <div className="text-wrap-balance mb-6 text-center text-2xl font-semibold">
              Monitor Visual Changes and prevent Regressions
            </div>
            <p className="my-6 text-left">
              Monitor all visual changes from your site's user flows on every
              deployment.
            </p>
            <div className="text-center">
              <LoginButtons />
            </div>
          </div>
        )}
      </ErrorBoundary>
    </Container>
  );
};
