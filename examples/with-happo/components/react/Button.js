import React from 'react'

const style = {
  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
  borderRadius: 3,
  border: 0,
  color: 'white',
  height: 48,
  fontSize: 14,
  padding: '0 30px',
  boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .30)',
}

function Button() {
  return (
    <button type="button" style={style}>
      {'React'}
    </button>
  )
}

export default Button
