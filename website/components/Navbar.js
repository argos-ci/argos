import { x } from "@xstyled/styled-components";
import { IoLogoGithub } from "react-icons/io5";
import { Link } from "components/Link";
import { PageContainer } from "@components/PageContainer";
import { ArgosLogo } from "@components/ArgosLogo";
import { Button } from "@components/Button";

export const AppNavbar = () => {
  return (
    <x.nav borderBottom={1} borderBottomColor="border">
      <PageContainer
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        gap={6}
        py={4}
      >
        <Link href="/">
          <ArgosLogo height={32} />
        </Link>
        <Button
          as="a"
          href="https://github.com/login/oauth/authorize?scope=user:email&client_id=Iv1.d1a5403395ac817e"
          $tint="blue-gray"
        >
          <x.svg as={IoLogoGithub} mr={2} /> Login with GitHub
        </Button>
      </PageContainer>
    </x.nav>
  );
};
