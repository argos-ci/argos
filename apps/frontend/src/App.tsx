import { NuqsAdapter } from "nuqs/adapters/react-router/v8";
import { Helmet } from "react-helmet";
import { RouterProvider } from "react-router";

import { ColorModeProvider } from "@/ui/ColorMode";

import { ApolloInitializer } from "./containers/Apollo";
import { AuthContextProvider } from "./containers/Auth";
import { RoutePreloader } from "./containers/RoutePreloader";
import { router } from "./router";
import { Toaster } from "./ui/Toaster";

export function App() {
  return (
    <>
      <Helmet defaultTitle="Argos" titleTemplate="%s - Argos" />
      <NuqsAdapter>
        <ColorModeProvider>
          <ApolloInitializer>
            <AuthContextProvider>
              <RouterProvider router={router} useTransitions={false} />
              <RoutePreloader />
              <Toaster />
            </AuthContextProvider>
          </ApolloInitializer>
        </ColorModeProvider>
      </NuqsAdapter>
    </>
  );
}
