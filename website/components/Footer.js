import { x } from '@xstyled/styled-components'
import { Image } from './Image'
import { Link } from './Link'
import { Navbar, NavbarSecondary } from './Navbar'
import smoothCodeLogo from 'img/smooth-code-logo.png'

export const AppFooter = (props) => (
  <x.footer backgroundColor="background-secondary" mt={24} {...props}>
    <Navbar>
      <x.div display="flex" alignItems="center">
        By
        <Image
          src={smoothCodeLogo}
          alt="Logo Smooth Code"
          w="130px"
          mt="8px"
          ml="4px"
        />
      </x.div>
      <NavbarSecondary>
        <Link href="/terms">Terms</Link>
        <Link href="/terms">Privacy</Link>
        <Link href="/security">Security</Link>
      </NavbarSecondary>
    </Navbar>
  </x.footer>
)
