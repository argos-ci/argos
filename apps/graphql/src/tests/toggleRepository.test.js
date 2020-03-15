import request from 'supertest'
import { useDatabase, factory } from '@argos-ci/database/testing'
import { job as buildJob } from '@argos-ci/build'
import { expectNoGraphQLError } from '../testing'
import { apolloServer } from '../apollo'
import { createApolloServerApp } from './util'

jest.mock('@argos-ci/build-notification')

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
      const res = await request(createApolloServerApp(apolloServer, { user }))
        .post('/graphql')
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
      expectNoGraphQLError(res)
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
