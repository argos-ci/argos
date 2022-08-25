import styled from "@xstyled/styled-components";
import { BaseLink } from "./Link";

export const Navbar = styled.nav`
  padding: 5 3 4;
  max-width: container;
  margin: 0 auto;
  display: flex;
  align-items: center;
`;

export const NavbarBrandLink = styled(BaseLink)`
  flex: 1 0;
`;

export const NavbarBrand = styled.h1`
  font-size: xl;
  color: primary-text;
  display: flex;
  align-items: center;
  font-weight: normal;
  margin: 0;
  text-decoration: none;
`;

export const NavbarSecondary = styled.div`
  flex-shrink: 0;
`;
