import { x } from '@xstyled/styled-components'
import { PageContainer } from 'components/PageContainer'

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
  <x.div display="flex" alignItems="center" gap={4} {...props} />
)
