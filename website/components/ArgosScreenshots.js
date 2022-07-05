import { x } from '@xstyled/styled-components'
import argosDiffPicture1 from 'img/argos-diff-picture-1.png'
import argosDiffPicture2 from 'img/argos-diff-picture-2.png'
import argosDiffPicture3 from 'img/argos-diff-picture-3.png'
import { GradientText, Text } from './AnimationText'
import { Image } from './Image'

const Card = (props) => (
  <x.div
    borderLeft="solid 2px"
    borderRadius="4px"
    my="5px"
    bg="#2c323e"
    {...props}
  />
)
const CardHeader = (props) => (
  <x.div
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    bg="rgba(255, 255, 255, 0.04)"
    p="8px"
    borderBottom="solid 1px"
    borderColor="#424752"
    {...props}
  />
)
const CardTitle = (props) => <x.div fontSize="18px" {...props} />
const CardBody = (props) => <x.div p="16px" {...props} />

const Button = (props) => (
  <x.div
    bg="#28a745"
    fontSize="16px"
    px="10px"
    py="6px"
    display="flex"
    gap="4px"
    alignItems="center"
    borderRadius="4px"
    h="36px"
    {...props}
  />
)

export const ArgosScreenshots = (props) => (
  <Card
    borderColor="#ffc107"
    color="white"
    zIndex={100}
    position="absolute"
    top="-10px"
    transition="opacity 1200ms 700ms"
    {...props}
  >
    <CardHeader>
      <CardTitle>Screenshots</CardTitle>
    </CardHeader>
    <CardBody>
      <x.div display="flex" gap="10px" alignItems="center">
        <Button>Hide</Button> item-details-mobile-screenshot.png
      </x.div>

      <x.div display="flex" gap="10px" mt="20px">
        <Image src={argosDiffPicture1} alt="argos diff picture 1" />
        <Image src={argosDiffPicture2} alt="argos diff picture 2" />
        <Image src={argosDiffPicture3} alt="argos diff picture 3" />
      </x.div>
    </CardBody>
  </Card>
)
