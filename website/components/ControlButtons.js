import { x } from '@xstyled/styled-components'

const colors = {
  danger: '#ff5f56',
  warning: '#ffbd2e',
  success: '#27c93f',
}

export const ControlButton = ({ variant, ...props }) => {
  const color = colors[variant] || colors.success
  return <x.div w="12px" h="12px" borderRadius="full" bg={color} {...props} />
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
