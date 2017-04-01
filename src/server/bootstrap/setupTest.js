/* eslint-disable no-console */
import { initializeCrashReporter } from 'modules/crashReporter/crashReporter'

// Add until method to enzyme Wrapper
import 'modules/enzyme/add/until'

initializeCrashReporter()
