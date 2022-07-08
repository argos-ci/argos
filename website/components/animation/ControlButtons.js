import { x } from '@xstyled/styled-components'

export const ControlButton = ({ variant = 'success', ...props }) => {
  return <x.div w="12px" h="12px" borderRadius="full" bg={variant} {...props} />
}

export const ControlButtons = (props) => (
  <x.div
    display="flex"
    alignItems="center"
    gap="8px"
    pl="12px"
    pr="8px"
    position="absolute"
    {...props}
  >
    <ControlButton variant="danger" />
    <ControlButton variant="warning" />
    <ControlButton variant="success" />
  </x.div>
)
