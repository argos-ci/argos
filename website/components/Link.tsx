import NextLink from "next/link";
import { ComponentProps } from "react";

export const Link = ({
  children,
  href,
  ...props
}: ComponentProps<typeof NextLink>) => (
  <NextLink
    href={href}
    className="transition no-underline text-white hover:text-on-light"
    {...props}
  >
    {children}
  </NextLink>
);
