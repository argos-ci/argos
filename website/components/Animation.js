import { useEffect, useState } from 'react'
import { x } from '@xstyled/styled-components'
import { GithubMergeStatus } from './GithubMergeStatus'
import { ArgosScreenshots } from './ArgosScreenshots'
import { GradientText, Text } from './AnimationText'

export function Animation(props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((step) => (step + 1) % 20)
    }, 500)

    return () => clearTimeout(interval)
  })

  return (
    <x.div position="relative" {...props}>
      <GithubMergeStatus status="error" mt="10px" />
      <Text opacity={0 < step && step < 9 ? 1 : 0}>
        Look like Argos CI detects some differences. Let’s review the
        screenshots...
      </Text>
      <ArgosScreenshots opacity={9 <= step && step < 19 ? 1 : 0} />
      <Text opacity={9 < step && step < 18 ? 1 : 0} mt="-22px">
        <GradientText>Something smells fishy... </GradientText>
        🧐
        <x.div>&ldquo;I should fix my code and push again&rdquo;</x.div>
      </Text>
    </x.div>
  )
}
