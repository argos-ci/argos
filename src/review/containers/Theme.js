import React from 'react'
import { theme as suiTheme } from '@smooth-ui/core-sc'
import { css, ThemeProvider } from '@xstyled/styled-components'
import { rpxTransformers } from '@xstyled/system'

const theme = {
  ...suiTheme,
  sizes: {
    ...suiTheme.sizes,
    container: 1040,
  },
  transformers: {
    ...rpxTransformers,
  },
  texts: {
    headline: {
      style: css`
        max-width: 500; // Don't use more space than the title.
        margin-bottom: 3;
      `,
    },
  },
}

export function ThemeInitializer({ children }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}
