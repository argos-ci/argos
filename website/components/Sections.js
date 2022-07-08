import { x } from '@xstyled/styled-components'

export const Section = (props) => <x.div py={16} {...props} />

export const SectionHeader = ({ children, ...props }) => (
  <x.div
    display="grid"
    gridTemplateColumns="auto 1fr"
    columnGap={3}
    my={4}
    {...props}
  >
    {children}
  </x.div>
)
export const SectionIcon = ({ icon: Icon, props }) => (
  <x.div gridColumn="1" gridRow="1 / span 2">
    <x.div
      as={Icon}
      w={16}
      h={16}
      backgroundColor="black"
      color="title"
      borderRadius="10%"
      boxShadow="md"
      px={3}
      {...props}
    />
  </x.div>
)

export const SectionColoredTitle = (props) => (
  <x.h2 fontSize="lg" color="primary" gridColumn="2" mt="3px" {...props} />
)

export const SectionTitle = (props) => (
  <x.div
    fontSize="3xl"
    gridColumn="2"
    color="title"
    fontWeight="semibold"
    {...props}
  />
)
