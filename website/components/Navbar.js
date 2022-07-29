import { x } from "@xstyled/styled-components";
import { IoLogoGithub } from "react-icons/io5";
import { Link } from "components/Link";
import { PageContainer } from "@components/PageContainer";
import { ArgosLogo } from "@components/ArgosLogo";
import { Button } from "@components/Button";

export const Navbar = ({ children, ...props }) => (
  <x.div>
    <PageContainer
      h="70px"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      gap={6}
      {...props}
    >
      {children}
    </PageContainer>
  </x.div>
);

export const NavbarSecondary = (props) => (
  <x.div display="flex" alignItems="center" gap={{ _: 4, sm: 8 }} {...props} />
);

export const AppNavbar = () => (
  <x.div backgroundColor="background-secondary">
    <Navbar>
      <Link href="/">
        <ArgosLogo height={32} />
      </Link>
      <NavbarSecondary>
        <Button
          as="a"
          href="https://github.com/login/oauth/authorize?scope=user:email&client_id=Iv1.d1a5403395ac817e"
        >
          Login
          <x.svg as={IoLogoGithub} ml={2} />
        </Button>
      </NavbarSecondary>
    </Navbar>
  </x.div>
);
