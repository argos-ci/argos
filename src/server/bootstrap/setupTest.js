process.env.NODE_ENV = 'test'

jest.mock('server/jobs/bucketBuild')
jest.mock('server/jobs/screenshotDiff')
