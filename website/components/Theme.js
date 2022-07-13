import {
  defaultTheme,
  generateHexAlphaVariants,
} from '@xstyled/styled-components'

export const theme = {
  ...defaultTheme,

  colors: {
    ...defaultTheme.colors,

    ...generateHexAlphaVariants({
      primary: defaultTheme.colors['purple-500'],
    }),

    danger: '#ff5f56',
    warning: '#ffbd2e',
    success: '#27c93f',

    'body-background': '#151a2d',
    'background-secondary': '#001320',
    'background-dark': defaultTheme.colors['gray-900'],

    title: defaultTheme.colors['blue-gray-100'],
    secondary: defaultTheme.colors['blue-gray-400'],
    border: defaultTheme.colors['gray-500'],
    outline: defaultTheme.colors['light-blue-600'],
  },
}
