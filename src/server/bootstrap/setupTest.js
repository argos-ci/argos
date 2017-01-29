process.env.NODE_ENV = 'test'

jest.mock('server/jobs/build')
jest.mock('server/jobs/screenshotDiff')
