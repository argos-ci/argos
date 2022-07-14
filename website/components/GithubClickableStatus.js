import { Button } from '@components/Button'
import { x } from '@xstyled/styled-components'
import { useState } from 'react'
import { GithubMergeStatus } from './animation/GithubStatus'

export const GithubClickableStatus = (props) => {
  const [githubStatus, setGithubStatus] = useState('error')

  return (
    <x.div {...props}>
      <Button
        mb={4}
        onClick={() => setGithubStatus('success')}
        disabled={githubStatus === 'success'}
      >
        Approve screenshot diffs
      </Button>
      <GithubMergeStatus status={githubStatus} />
    </x.div>
  )
}
