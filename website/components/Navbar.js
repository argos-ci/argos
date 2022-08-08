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
        gap={2}
        py={4}
      >
        <Link href="/">
          <ArgosLogo width="100%" h="32px" />
        </Link>
        <x.div
          flex={1}
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
          gap={2}
        >
          <Button as="a" href="https://docs.argos-ci.com">
            docs
          </Button>
          <Button
            as="a"
            href="https://github.com/login/oauth/authorize?scope=user:email&client_id=Iv1.d1a5403395ac817e"
            $tint="blue-gray"
            gap={1}
          >
            <x.svg as={IoLogoGithub} mr={2} />
            Login
            <x.div display={{ _: "none", sm: "block" }}> with GitHub</x.div>
          </Button>
        </x.div>
      </PageContainer>
    </x.nav>
  );
};
