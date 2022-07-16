import { forwardRef } from 'react'
import { x } from '@xstyled/styled-components'
import { IoCheckmark } from 'react-icons/io5'

export const ArgosCard = (props) => (
  <x.div
    borderLeft="solid 2px"
    borderRadius="4px"
    backgroundColor="blue-gray-700-a90"
    {...props}
  />
)

export const ArgosCardHeader = forwardRef((props, ref) => (
  <x.div
    ref={ref}
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    px={2}
    pt={2}
    pb={1}
    {...props}
  />
))

export const ArgosCardTitle = (props) => (
  <x.div fontSize="15px" color="secondary" fontWeight="semibold" {...props} />
)

export const ArgosCardBody = forwardRef((props, ref) => (
  <x.div
    position="relative"
    display="flex"
    py={2}
    px={2}
    ref={ref}
    justifyContent="flex-between"
    gap={{ _: 2, sm: 4 }}
    {...props}
  />
))

export const ArgosApproveButton = forwardRef(
  ({ variant = 'success', ...props }, ref) => (
    <x.div
      bg={variant === 'success' ? 'success' : 'warning'}
      ref={ref}
      fontSize="14px"
      px="12px"
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
