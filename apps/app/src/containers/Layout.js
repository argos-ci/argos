import React from "react";
import { Outlet } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { AppFooter } from "./AppFooter";
import { AppNavbar } from "./AppNavbar";
import { SyncAlert } from "./SyncAlert";

export const Layout = (props) => {
  return (
    <x.div minHeight="100%" display="flex" flexDirection="column" {...props}>
      <x.header flex="0 0 auto">
        <AppNavbar />
      </x.header>

      <SyncAlert />

      <x.main mt={6} flex="1 1 auto">
        <Outlet />
      </x.main>

      <x.footer flex="0 0 auto" mt={16}>
        <AppFooter />
      </x.footer>
    </x.div>
  );
};
