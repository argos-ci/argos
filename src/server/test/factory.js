/* eslint-disable import/no-extraneous-dependencies */

import { factory } from 'factory-girl'
import crypto from 'crypto'
import ObjectionAdapter from 'server/test/ObjectionAdapter'
import { VALIDATION_STATUS } from 'server/constants'
import Build from 'server/models/Build'
import BuildNotification from 'server/models/BuildNotification'
import Organization from 'server/models/Organization'
import Repository from 'server/models/Repository'
import Screenshot from 'server/models/Screenshot'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import Synchronization from 'server/models/Synchronization'
import User from 'server/models/User'
import UserRepositoryRight from 'server/models/UserRepositoryRight'
import UserOrganizationRight from 'server/models/UserOrganizationRight'

factory.setAdapter(new ObjectionAdapter())

// Taken from uuid/bytesToUuid.js
function bytesToString(bytes) {
  let output = ''
  for (let i = 0; i < bytes.length; i += 1) {
    output += (bytes[i] + 0x100).toString(16).substr(1)
  }
  return output
}

factory.define('ScreenshotBucket', ScreenshotBucket, {
  name: factory.sequence('repository.name', n => `bucket-${n}`),
  commit: () => bytesToString(crypto.randomBytes(20)),
  branch: 'master',
  repositoryId: factory.assoc('Repository', 'id'),
})

factory.define(
  'Build',
  Build,
  {
    jobStatus: 'complete',
    repositoryId: factory.assoc('Repository', 'id'),
  },
  {
    async afterBuild(model, attrs) {
      const newModel = model
      if (!attrs.compareScreenshotBucketId) {
        const compareScreenshotBucket = await factory.create('ScreenshotBucket', {
          repositoryId: model.repositoryId || attrs.repositoryId,
        })
        newModel.compareScreenshotBucketId = compareScreenshotBucket.id
      } else {
        newModel.compareScreenshotBucketId = attrs.compareScreenshotBucketId
      }

      return newModel
    },
  }
)

factory.define('BuildNotification', BuildNotification, {
  buildId: factory.assoc('Build', 'id'),
  jobStatus: 'complete',
  type: 'no-diff-detected',
})

factory.define('User', User, {
  githubId: factory.sequence('user.githubId', n => n),
  name: factory.chance('name'),
  login: factory.sequence('user.login', n => `user-${n}`),
  email: factory.sequence('user.email', n => `user-${n}@email.com`),
})

factory.define('Organization', Organization, {
  githubId: factory.sequence('organization.githubId', n => n),
  name: factory.sequence('organization.name', n => `Orga-${n}`),
  login: factory.sequence('organization.login', n => `orga-${n}`),
})

factory.define('Repository', Repository, {
  githubId: factory.sequence('repository.githubId', n => n),
  name: factory.sequence('repository.name', n => `repo-${n}`),
  enabled: true,
  baselineBranch: 'master',
  organizationId: factory.assoc('Organization', 'id'),
  private: false,
})

factory.define('UserRepositoryRight', UserRepositoryRight, {
  userId: factory.assoc('User', 'id'),
  repositoryId: factory.assoc('Repository', 'id'),
})

factory.define('UserOrganizationRight', UserOrganizationRight, {
  userId: factory.assoc('User', 'id'),
  organizationId: factory.assoc('Organization', 'id'),
})

factory.define('ScreenshotDiff', ScreenshotDiff, {
  buildId: factory.assoc('Build', 'id'),
  baseScreenshotId: factory.assoc('Screenshot', 'id'),
  compareScreenshotId: factory.assoc('Screenshot', 'id'),
  jobStatus: 'complete',
  validationStatus: VALIDATION_STATUS.accepted,
  score: 0,
})

factory.define('Screenshot', Screenshot, {
  name: factory.sequence('repository.name', n => `screen-${n}`),
  s3Id: 'test-s3-id',
  screenshotBucketId: factory.assoc('ScreenshotBucket', 'id'),
})

factory.define('Synchronization', Synchronization, {
  userId: factory.assoc('User', 'id'),
  jobStatus: 'complete',
  type: 'github',
})

export default factory
