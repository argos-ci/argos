import { x } from '@xstyled/styled-components'
import argosDiffPicture1 from 'img/argos-diff-picture-1.png'
import argosDiffPicture2 from 'img/argos-diff-picture-2.png'
import argosDiffPicture3 from 'img/argos-diff-picture-3.png'
import { FaCheck, FaTimes, FaRegClock } from 'react-icons/fa'
import { GoPulse, GoGitCommit, GoGitBranch } from 'react-icons/go'
import { Image } from './Image'
import {
  DetailsScreenshot,
  DetailsScreenshotDiff,
  MobileScreenshot,
  MobileScreenshotDiff,
} from './Screenshot'

export const ArgosCard = (props) => (
  <x.div borderLeft="solid 2px" borderRadius="4px" bg="#2c323e" {...props} />
)
export const ArgosCardHeader = (props) => (
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
export const ArgosCardTitle = (props) => <x.div fontSize="18px" {...props} />
export const ArgosCardBody = (props) => <x.div px="16px" pb="8px" {...props} />

export const ArgosButton = (props) => (
  <x.div
    bg="#28a745"
    fontSize="16px"
    px="16px"
    py="4px"
    display="flex"
    gap="4px"
    alignItems="center"
    borderRadius="4px"
    {...props}
  />
)

export const ArgosScreenshotTitle = (props) => (
  <x.div
    color="secondary"
    fontSize="14px"
    mt="15px"
    pb="4px"
    borderBottom={1}
    borderColor="border"
    {...props}
  />
)

export const ArgosNavbar = (props) => (
  <x.div
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    h="50px"
    w={1}
    bg="#242830"
    px="16px"
  >
    <x.div as={HorizontalLogo} mt={1} ml={-2} />
  </x.div>
)

export const ArgosBanner = (props) => (
  <x.div
    color="white"
    bg="#2c323e"
    borderTop={1}
    borderBottom={1}
    borderColor="#424752"
    px="16px"
  >
    <x.div
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      py="24px"
    >
      <x.div
        display="flex"
        alignItems="center"
        gap="10px"
        fontSize={24}
        fontWeight={300}
      >
        <x.div as={GoRepo} w="24px" h="24px" mt="4px" />
        amazing<div>/</div>
        <div>Shop</div>
      </x.div>

      <x.div display="flex" alignItems="center" gap="6px">
        <x.div as={FaGithub} />
        amazing/Shop
      </x.div>
    </x.div>

    <x.div display="flex" mb={-1} fontSize="14px" fontWeight={500}>
      <x.div p="16px" borderBottom={1} borderColor="white">
        Builds
      </x.div>
      <x.div p="16px">Settings</x.div>
    </x.div>
  </x.div>
)

export const ArgosSummary = (props) => (
  <ArgosCard borderColor="#dc3545" {...props}>
    <ArgosCardHeader>
      <ArgosCardTitle>Summary</ArgosCardTitle>
      <ArgosButton>
        <x.div as={FaCheck} w="12px" />
        Mark as approved
      </ArgosButton>
    </ArgosCardHeader>

    <ArgosCardBody>
      <x.div display="flex" justifyContent="space-between" color="#dc3545">
        <x.div display="flex" gap="10px" alignItems="center">
          <x.div as={FaTimes} mb="-2px" />
          <x.div>rework-button</x.div>
          <x.div>517b9dc1500092b8c9e9620770456c5621762a89</x.div>
        </x.div>
        <x.div>
          <x.div as={GoPulse} mr="10px" mb="-2px" />
          #5 failure
        </x.div>
      </x.div>

      <x.div display="flex" justifyContent="space-between" mt="16px" ml="24px">
        <div>
          <div>
            <x.div as={GoGitCommit} mr="10px" />
            Commit 517b9dc
          </div>
          <div>
            <x.div as={GoGitBranch} mr="10px" />
            Branch rework-button
          </div>
        </div>
        <div>
          <x.div as={FaRegClock} mr="10px" mb="-2px" />
          10 sec ago
        </div>
      </x.div>
    </ArgosCardBody>
  </ArgosCard>
)
