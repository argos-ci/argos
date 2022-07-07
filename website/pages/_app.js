import '../styles/globals.css'
import { StrictMode } from 'react'
import { ThemeProvider, Preflight } from '@xstyled/styled-components'
import { theme } from '../components/Theme'

function MyApp({ Component, pageProps }) {
  return (
    <StrictMode>
      <ThemeProvider theme={theme}>
        <Preflight />
        <Component {...pageProps} />
      </ThemeProvider>
    </StrictMode>
  )
}

export default MyApp
