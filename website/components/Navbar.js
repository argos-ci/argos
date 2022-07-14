import { x } from '@xstyled/styled-components'
import { IoLogoGithub } from 'react-icons/io5'
import { Link } from 'components/Link'
import { PageContainer } from '@components/PageContainer'
import { HorizontalLogo } from '@components/HorizontalLogo'
import { Button } from '@components/Button'

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
)

export const NavbarSecondary = (props) => (
  <x.div display="flex" alignItems="center" gap={{ _: 4, sm: 8 }} {...props} />
)

export const AppNavbar = () => (
  <x.div backgroundColor="background-secondary">
    <Navbar>
      <Link href="/">
        <x.div as={HorizontalLogo} mt={1} ml={-2} />
      </Link>
      <NavbarSecondary>
        <Link href="http://www.google.fr">
          Login
          <x.div as={IoLogoGithub} />
        </Link>
        <Button>Try now</Button>
      </NavbarSecondary>
    </Navbar>
  </x.div>
)
