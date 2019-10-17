import React from 'react'
import filesize from 'filesize'

export const FileSize = React.memo(function FileSize({ children }) {
  return filesize(children)
})
