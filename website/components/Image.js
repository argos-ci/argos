import { x } from '@xstyled/styled-components'
import NextImage from 'next/image'

export const Image = ({ src, alt, width, height, ...props }) => (
  <x.div {...props}>
    <NextImage src={src} alt={alt} width={width} height={height} />
  </x.div>
)
