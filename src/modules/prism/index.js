// @flow weak

import prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'

/* eslint-disable import/no-webpack-loader-syntax */
import lightTheme from '!raw-loader!prismjs/themes/prism.css'
/* eslint-enable import/no-webpack-loader-syntax */

const styleNode = window.document.createElement('style')
styleNode.setAttribute('data-prism', true)
window.document.head.appendChild(styleNode)

function setPrismTheme(theme) {
  styleNode.textContent = theme
}

setPrismTheme(lightTheme)

export default prism
