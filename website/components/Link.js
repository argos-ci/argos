import { x } from "@xstyled/styled-components";
import NextLink from "next/link";

export const Link = ({ children, href, ...props }) => (
  <NextLink href={href} passHref>
    <x.a
      cursor="pointer"
      transition="300ms"
      display="flex"
      alignItems="center"
      gap={1}
      textDecoration="none"
      color={{ _: "white", hover: "secondary" }}
      {...props}
    >
      {children}
    </x.a>
  </NextLink>
);
