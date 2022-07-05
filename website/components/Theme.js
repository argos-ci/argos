import {
  defaultTheme,
  generateHexAlphaVariants,
} from '@xstyled/styled-components'

export const theme = {
  ...defaultTheme,

  colors: {
    ...defaultTheme.colors,

    ...generateHexAlphaVariants({ primary: defaultTheme.colors['purple-700'] }),
    secondary: defaultTheme.colors['blue-gray-400'],
    'navbar-background': defaultTheme.colors['gray-800'],
    'hover-background': defaultTheme.colors['gray-700'],
    'background-dark': defaultTheme.colors['gray-900'],
    border: defaultTheme.colors['gray-500'],
    outline: defaultTheme.colors['light-blue-600'],
  },
}
