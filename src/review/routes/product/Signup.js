import React from 'react'
import Button from 'material-ui-build-next/src/Button'

function handleClickSignup() {
  window.location = '/auth/github'
}

export default function Signup() {
  return (
    <Button raised accent onClick={handleClickSignup}>
      {'Sign up'}
    </Button>
  )
}
