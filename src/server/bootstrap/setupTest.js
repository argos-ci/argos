/* eslint-disable no-console */
import { initializeCrashReporter } from 'modules/crashReporter/crashReporter'

// Add until method to enzyme Wrapper
import 'modules/enzyme/add/until'

jest.mock('server/jobs/build')
jest.mock('server/jobs/screenshotDiff')
jest.mock('server/jobs/synchronize')

initializeCrashReporter()
