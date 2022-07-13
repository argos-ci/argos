import { x } from '@xstyled/styled-components'

export const Section = (props) => <x.div pt={10} pb={16} {...props} />

export const SectionHeader = ({ children, ...props }) => (
  <x.div
    display="grid"
    gridTemplateColumns="auto 1fr"
    columnGap={3}
    rowGap={2}
    my={4}
    {...props}
  >
    {children}
  </x.div>
)
export const SectionIcon = ({ icon: Icon, ...props }) => (
  <x.div gridColumn="1" gridRow={{ _: '1', sm: '1 / span 2' }}>
    <x.div
      as={Icon}
      w={16}
      h={16}
      // backgroundColor="black"
      color="title"
      borderRadius="2xl"
      borderColor="primary"
      boxShadow="md"
      px={3}
      backgroundImage="gradient-to-b"
      gradientFrom="primary-a20"
      gradientTo="primary-a60"
      {...props}
    />
  </x.div>
)

export const SectionColoredTitle = (props) => (
  <x.h2
    fontSize="lg"
    color="primary"
    gridColumn={{ _: '1', sm: '2' }}
    gridRow={{ _: '2', sm: '1' }}
    mt="3px"
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
