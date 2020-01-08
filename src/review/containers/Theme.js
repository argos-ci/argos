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
  useColorSchemeMediaQuery: true,
  useCustomProperties: false,
  initialColorModeName: 'light',
  // defaultColorModeName: 'dark',
  colors: {
    ...suiTheme.colors,
    gray900: '#242830',
    gray800: '#2c323e',
    gray700: '#424752',
    gray600: '#8A94A7',
    gray400: '#E7E9F3',
    gray300: '#dce3f6',
    gray200: '#f2f4fb',
    gray100: '#FDFEFF',
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
