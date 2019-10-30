import React from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Box,
  Menu,
  MenuItem,
  MenuDisclosure,
  useMenuState,
} from '@smooth-ui/core-sc'
import configBrowser from 'configBrowser'
import { FaGithub } from 'react-icons/fa'
import {
  NavbarSecondary,
  NavbarBrandLink,
  Navbar,
  NavbarBrand,
  BrandLogo,
} from 'components'
import { OwnerAvatar } from 'containers/OwnerAvatar'
import { useLogout } from './Auth'
import { useUser } from './User'

delete MenuDisclosure.propTypes.children

function UserMenu({ user }) {
  const logout = useLogout()
  const menu = useMenuState({
    placement: 'bottom-end',
    unstable_gutter: 4,
    unstable_animated: true,
  })

  return (
    <>
      <MenuDisclosure {...menu}>
        {({ type, ...disclosureProps }) => (
          <OwnerAvatar owner={user} {...disclosureProps} />
        )}
      </MenuDisclosure>
      <Menu aria-label="User settings" {...menu}>
        {!user.privateSync && (
          <MenuItem
            {...menu}
            forwardedAs="a"
            href="/auth/github-private"
            rel="noopener noreferrer"
          >
            Sync. private repos
          </MenuItem>
        )}
        <MenuItem
          {...menu}
          forwardedAs="a"
          href={configBrowser.get('github.applicationUrl')}
          target="_blank"
          rel="noopener noreferrer"
        >
          Manage permissions
        </MenuItem>
        <MenuItem {...menu} forwardedAs="a" href="/auth/logout">
          Logout
        </MenuItem>
      </Menu>
    </>
  )
}

export function AppNavbar() {
  const user = useUser()
  return (
    <Navbar>
      <NavbarBrandLink as={Link} to="/">
        <NavbarBrand>
          <BrandLogo width={200} />
        </NavbarBrand>
      </NavbarBrandLink>
      <NavbarSecondary>
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Button
            variant="dark"
            as="a"
            href="/auth/github-public"
            display="flex"
            alignItems="center"
          >
            <Box as="span" mr={1}>
              Login
            </Box>
            <FaGithub />
          </Button>
        )}
      </NavbarSecondary>
    </Navbar>
  )
}
