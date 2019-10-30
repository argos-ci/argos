/* eslint-disable no-console, no-underscore-dangle */
import { configure } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import consoleError from './consoleError'

configure({ adapter: new Adapter() })

consoleError()
