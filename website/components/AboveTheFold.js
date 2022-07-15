import { x } from '@xstyled/styled-components'
import { Subtitle, Title } from 'components/Titles'
import { GradientText } from '@components/GradientText'
import { Button } from '@components/Button'
import { Animation } from './home-illustrations/Animation'

export const AboveTheFold = (props) => {
  return (
    <x.div
      display="flex"
      flexDirection={{ _: 'column', lg: 'row' }}
      justifyContent="space-between"
      alignItems="center"
      columnGap={10}
      rowGap={20}
    >
      <x.div
        flex={{ _: 1, lg: 1 / 2 }}
        alignItems={{ _: 'flex-start', sm: 'center', lg: 'flex-start' }}
        maxW={{ sm: '500px' }}
        display="flex"
        flexDirection="column"
        gap={8}
      >
        <Title {...props}>
          Screenshot Testing
          <GradientText as="div">catch visual bugs</GradientText>
        </Title>
        <Subtitle>
          Adds screenshot review to your developer team’s routine.{' '}
          <x.span color="secondary">
            Compare pull-requests screenshots and be notified when{' '}
            <x.span color="gray-200" top="-2px" position="relative">
              something*{' '}
            </x.span>
            changes.
          </x.span>
        </Subtitle>
        <Button
          w={{ _: 1, sm: 200, lg: 'auto' }}
          px={6}
          h={12}
          fontWeight="semibold"
        >
          Get started
        </Button>
      </x.div>
      <x.div
        display="flex"
        flex={{ lg: 1 / 2 }}
        w={1}
        justifyContent={{ _: 'center', lg: 'flex-start' }}
        overflow="hidden"
        position="relative"
      >
        <Animation />
      </x.div>
    </x.div>
  )
}
