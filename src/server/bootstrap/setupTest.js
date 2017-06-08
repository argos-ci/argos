/* eslint-disable no-console */

import { initializeCrashReporter } from 'modules/crashReporter'

// Add until method to enzyme Wrapper
import 'modules/enzyme/add/until'
import consoleError from './consoleError'

initializeCrashReporter()
consoleError()
