import { x } from '@xstyled/styled-components'
import {
  Toolbar as AriakitToolbar,
  ToolbarItem as AriakitToolbarItem,
  ToolbarSeparator as AriakitToolbarSeparator,
  useToolbarState,
} from 'ariakit/toolbar'

export const ToolbarItem = (props) => (
  <x.div as={AriakitToolbarItem} backgroundColor="transparent" {...props} />
)
export const ToolbarSeparator = (props) => (
  <x.div as={AriakitToolbarSeparator} {...props} />
)

export function Toolbar({ children, ...props }) {
  const toolbar = useToolbarState()

  return (
    <AriakitToolbar state={toolbar} backgroundColor="black" {...props}>
      {children}
    </AriakitToolbar>
  )
}
