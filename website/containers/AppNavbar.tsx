import { ArgosLogo } from "@/components/ArgosLogo";
import { x } from "@xstyled/styled-components";
import { Button } from "@/components/Button";
import React from "react";
import { Navbar, NavbarLink } from "@/components/Navbar";
import { Link } from "@/components/Link";

export const AppNavbar: React.FC = () => {
  return (
    <Navbar
      primary={
        <Link href="/">
          <x.svg as={ArgosLogo} h={10} mt={1} />
        </Link>
      }
      secondary={
        <>
          <NavbarLink href="https://github.com/marketplace/argos-ci#pricing-and-setup">
            Pricing
          </NavbarLink>
          <NavbarLink href="https://docs.argos-ci.com/">Docs</NavbarLink>
          <NavbarLink href="https://github.com/login/oauth/authorize?scope=user:email&client_id=Iv1.d1a5403395ac817e">
            Login
          </NavbarLink>

          <Button
            mt={{ _: 3, md: 0 }}
            as="a"
            href="https://docs.argos-ci.com/"
            order={{ _: -1, md: 0 }}
            mb={{ _: 4, md: 0 }}
          >
            Get Started
          </Button>
        </>
      }
    />
  );
};
