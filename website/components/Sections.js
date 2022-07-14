import { x } from '@xstyled/styled-components'

export const Section = (props) => (
  <x.div pt={{ _: 10, lg: 16 }} pb={16} {...props} />
)

export const SectionHeader = ({ children, ...props }) => (
  <x.div
    display="grid"
    gridTemplateColumns="auto 1fr"
    gridTemplateRows={{ md: '26px 30px' }}
    columnGap={4}
    rowGap={{ xs: 4, md: 0 }}
    alignItems="flex-start"
    my={4}
    {...props}
  >
    {children}
  </x.div>
)
export const SectionIcon = ({ children, icon: Icon, ...props }) => (
  <x.div
    gridColumn="1"
    gridRow={{ _: '1', sm: '1 / span 2' }}
    borderRadius="full"
    px={2}
    backgroundColor="black-a70"
    w={16}
    h={16}
    fontSize="45px"
    display="flex"
    justifyContent="center"
    alignItems="center"
    color="title"
    mb={{ xs: 3 }}
    {...props}
  >
    {Icon ? <x.div as={Icon} w={1} h={1} /> : children}
  </x.div>
)

export const SectionColoredTitle = (props) => (
  <x.h2
    fontSize="lg"
    fontWeight="600"
    color="primary"
    gridColumn={{ _: '1', sm: '2' }}
    gridRow={{ _: '2', sm: '1' }}
    {...props}
  />
)

export const SectionTitle = (props) => (
  <x.div
    fontSize="3xl"
    gridColumn={{ _: '1', sm: '2' }}
    gridRow={{ _: '3', sm: '2' }}
    color="title"
    fontWeight="semibold"
    {...props}
  />
)
