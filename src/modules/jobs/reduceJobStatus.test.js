import reduceJobStatus from './reduceJobStatus'

describe('modules/jobs/reduceJobStatus', () => {
  it('should be complete when everything is done', () => {
    const statuses = ['complete', 'complete']
    const status = reduceJobStatus(statuses)

    expect(status).toBe('complete')
  })

  it('should be progress when something has been done or is in progress', () => {
    const statuses = ['complete', 'pending']
    const status = reduceJobStatus(statuses)

    expect(status).toBe('progress')
  })

  it('should be pending when nothing started', () => {
    const statuses = ['pending', 'pending']
    const status = reduceJobStatus(statuses)

    expect(status).toBe('pending')
  })
})
