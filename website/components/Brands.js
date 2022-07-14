import { x } from '@xstyled/styled-components'
import { MuiLogo } from 'components/MuiLogo'
import { Image } from './Image'
import doctolibLogo from 'img/doctolib-logo.png'
import leMondeLogo from 'img/lemonde-logo.png'

export const BrandsTitle = (props) => (
  <x.div
    fontSize={{ _: '5xl', md: '5xl' }}
    mx="auto"
    textAlign="center"
    color="white"
    fontWeight="semibold"
    mb={8}
    {...props}
  />
)

const Brand = (props) => (
  <x.div
    display="flex"
    alignItems="center"
    justifyContent="center"
    flex={1}
    h={{ _: '150px', md: 24 }}
    borderStyle="dashed"
    {...props}
  />
)

export const Brands = (props) => (
  <x.div display="flex" justifyContent="space-between" {...props}>
    <Brand pr={{ _: 5, sm: 10 }}>
      <Image src={doctolibLogo} alt="Logo Doctolib" maxW="200px" />
    </Brand>
    <Brand>
      <x.div as={MuiLogo} h="60%" w={{ _: '40%', md: 'auto' }} maxW="200px" />
    </Brand>

    <Brand pl={{ _: 5, sm: 10 }}>
      <Image src={leMondeLogo} alt="Logo Le Monde" maxW="200px" />
    </Brand>
  </x.div>
)
