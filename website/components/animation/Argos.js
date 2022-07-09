import { forwardRef } from 'react'
import { x } from '@xstyled/styled-components'
import { IoCheckmark } from 'react-icons/io5'

export const ArgosCard = (props) => (
  <x.div borderLeft="solid 2px" borderRadius="4px" bg="#2c323e" {...props} />
)

export const ArgosCardHeader = forwardRef((props, ref) => (
  <x.div
    ref={ref}
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    bg="rgba(255, 255, 255, 0.04)"
    p="8px"
    borderBottom="solid 1px"
    borderColor="#424752"
    {...props}
  />
))

export const ArgosCardTitle = (props) => <x.div fontSize="18px" {...props} />

export const ArgosCardBody = forwardRef((props, ref) => (
  <x.div px="16px" pb="8px" ref={ref} {...props} />
))

export const ArgosApproveButton = forwardRef(
  ({ variant = 'success', ...props }, ref) => (
    <x.div
      mr="8px"
      bg={variant === 'success' ? 'success' : 'warning'}
      ref={ref}
      fontSize="16px"
      px="16px"
      py="4px"
      display="flex"
      gap="4px"
      alignItems="center"
      borderRadius="4px"
      color="white"
      {...props}
    >
      {variant === 'success' ? (
        <>
          <x.div as={IoCheckmark} />
          Approved
        </>
      ) : (
        'Mark as approved'
      )}
    </x.div>
  ),
)

export const Screenshots = forwardRef((props, ref) => (
  <x.div
    ref={ref}
    display="grid"
    gridTemplateColumns={3}
    rowGap={3}
    columnGap={2}
    mt={3}
    {...props}
  />
))
