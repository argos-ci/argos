import { Helmet } from "react-helmet";
import { RouterProvider } from "react-router-dom";

import { ApolloInitializer } from "./containers/Apollo";
import { AuthContextProvider } from "./containers/Auth";
import { ColorModeProvider } from "./containers/ColorMode";
import { router } from "./router";

export function App() {
  return (
    <>
      <Helmet defaultTitle="Argos" />
      <ColorModeProvider>
        <AuthContextProvider>
          <ApolloInitializer>
            <RouterProvider router={router} />
          </ApolloInitializer>
        </AuthContextProvider>
      </ColorModeProvider>
    </>
  );
}
