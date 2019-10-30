/* eslint-disable no-console, no-underscore-dangle */

// Add until method to enzyme Wrapper
import 'modules/enzyme/add/until'
import { configure } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import consoleError from './consoleError'

configure({ adapter: new Adapter() })

consoleError()
