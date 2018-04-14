import React from 'react'
import PropTypes from 'prop-types'
import TextField from 'material-ui/TextField'

function RFTextField(props) {
  const {
    autoComplete,
    input,
    meta: { touched, error },
    ...other
  } = props

  return (
    <TextField
      error={Boolean(touched && error)}
      {...input}
      {...other}
      inputProps={{
        autoComplete,
      }}
      helperText={touched ? error : ''}
    />
  )
}

RFTextField.propTypes = {
  autoComplete: PropTypes.string,
  input: PropTypes.object.isRequired,
  meta: PropTypes.shape({
    touched: PropTypes.bool.isRequired,
    error: PropTypes.string,
  }).isRequired,
}

export default RFTextField
