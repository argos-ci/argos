import request from 'supertest'
import { useDatabase, noGraphqlError } from 'server/test/utils'
import factory from 'server/test/factory'
import buildJob from 'server/jobs/build'
import graphqlMiddleware from '../middleware'

jest.mock('modules/build/notifications')

describe('GraphQL', () => {
  useDatabase()

  beforeEach(() => {
    buildJob.push = jest.fn()
  })

  describe('toggleRepository', () => {
    let user
    let organization
    let repository

    beforeEach(async () => {
      user = await factory.create('User')
      organization = await factory.create('Organization', {
        name: 'bar',
      })
      repository = await factory.create('Repository', {
        name: 'foo',
        organizationId: organization.id,
      })
      await factory.create('UserRepositoryRight', {
        userId: user.id,
        repositoryId: repository.id,
      })
      await factory.create('UserOrganizationRight', {
        userId: user.id,
        organizationId: organization.id,
      })
    })

    it('should mutate the repository', async () => {
      expect(repository.token).toBe(undefined)
      const res = await request(
        graphqlMiddleware({
          context: { user },
        })
      )
        .post('/')
        .send({
          query: `
            mutation {
              toggleRepository(
                enabled: true,
                repositoryId: "${repository.id}"
              ) {
                enabled
                token
              }
            }
          `,
        })
      noGraphqlError(res)
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({
        toggleRepository: {
          enabled: true,
        },
      })
      expect(buildJob.push.mock.calls.length).toBe(1)
      expect(res.body.data.toggleRepository.token.length).toBe(40)
    })
  })
})
