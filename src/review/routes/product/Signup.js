import React from 'react'
import Button from 'material-ui/Button'
import Link from 'modules/components/Link'

export default function Signup() {
  return (
    <Button
      raised
      accent
      component={Link}
      href="/auth/github"
    >
      {'Sign up'}
    </Button>
  )
}
