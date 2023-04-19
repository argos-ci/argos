import { ArgosLogo } from "@/components/ArgosLogo";
import { Button } from "@/components/Button";
import React from "react";
import { Navbar, NavbarLink } from "@/components/Navbar";
import NextLink from "next/link";

export const AppNavbar: React.FC = () => {
  return (
    <Navbar
      primary={
        <NextLink href="/">
          <ArgosLogo className="h-10 mt-1" />
        </NextLink>
      }
      secondary={
        <>
          <NavbarLink href="https://argos-ci.com/docs/">Docs</NavbarLink>
          <NavbarLink href="/pricing">Pricing</NavbarLink>
          <NavbarLink href="/blog">Blog</NavbarLink>
          <NavbarLink href="https://github.com/login/oauth/authorize?scope=user:email&client_id=Iv1.d1a5403395ac817e">
            Login
          </NavbarLink>

          <Button className="mt-3 md:mt-0 -order-1 md:order-[0] mb-4 md:mb-0">
            {(buttonProps) => (
              <a {...buttonProps} href="https://docs.argos-ci.com/">
                Get Started
              </a>
            )}
          </Button>
        </>
      }
    />
  );
};
