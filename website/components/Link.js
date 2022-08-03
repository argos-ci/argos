import { x } from "@xstyled/styled-components";
import NextLink from "next/link";

export const Link = ({ children, href, ...props }) => (
  <NextLink href={href} passHref>
    <x.a
      cursor="pointer"
      transition="300ms"
      textDecoration="none"
      color={{ _: "white", hover: "on-light" }}
      {...props}
    >
      {children}
    </x.a>
  </NextLink>
);
