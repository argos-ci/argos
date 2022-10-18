import React from "react";
import { Outlet } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { AppFooter } from "./AppFooter";
import { AppNavbar } from "./AppNavbar";
import { SyncAlert } from "./SyncAlert";
import { Catch } from "../components";
import { ErrorPage } from "../pages/ErrorPage";
import { AppHeader } from "./AppHeader";

export const Layout = (props) => {
  return (
    <x.div
      minHeight="100%"
      display="flex"
      flexDirection="column"
      backgroundColor="bg"
      {...props}
    >
      <x.div flex="0 0 auto">
        <AppNavbar />
        <AppHeader />
      </x.div>

      <SyncAlert />

      <x.main mt={6} flex="1 1 auto">
        <Catch fallback={<ErrorPage />}>
          <Outlet />
        </Catch>
      </x.main>

      <x.footer flex="0 0 auto" mt={16}>
        <AppFooter />
      </x.footer>
    </x.div>
  );
};
