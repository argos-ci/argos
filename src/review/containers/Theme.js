import React from 'react'
import { theme as suiTheme } from '@smooth-ui/core-sc'
import {
  css,
  ThemeProvider,
  ColorModeProvider,
  rpxTransformers,
} from '@xstyled/styled-components'

const theme = {
  ...suiTheme,
  useColorSchemeMediaQuery: false,
  useCustomProperties: false,
  initialColorModeName: 'light',
  // defaultColorModeName: 'dark',
  colors: {
    ...suiTheme.colors,
    primary: '#2F1868',
  },
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
  return (
    <ThemeProvider theme={theme}>
      <ColorModeProvider>{children}</ColorModeProvider>
    </ThemeProvider>
  )
}
