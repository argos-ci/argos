import styled from "@xstyled/styled-components";
import { FadeLink } from "./Link";

export const Navbar = styled.nav`
  padding: 20 3;
  max-width: container;
  margin: 0 auto;
  display: flex;
`;

export const NavbarBrandLink = styled(FadeLink)`
  flex: 1 0;
`;

export const NavbarBrand = styled.h1`
  font-size: 20;
  color: darker;
  display: flex;
  align-items: center;
  font-weight: normal;
  margin: 0;
  text-decoration: none;
`;

export const NavbarSecondary = styled.div`
  flex-shrink: 0;
`;
