import { Helmet } from "react-helmet";
import { RouterProvider } from "react-router-dom";

import { ColorModeProvider } from "@/ui/ColorMode";

import { ApolloInitializer } from "./containers/Apollo";
import { AuthContextProvider } from "./containers/Auth";
import { router } from "./router";
import { Toaster } from "./ui/Toaster";

export function App() {
  return (
    <>
      <Helmet defaultTitle="Argos" />
      <ColorModeProvider>
        <AuthContextProvider>
          <ApolloInitializer>
            <RouterProvider router={router} />
            <Toaster />
          </ApolloInitializer>
        </AuthContextProvider>
      </ColorModeProvider>
    </>
  );
}
