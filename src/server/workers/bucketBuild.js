import 'server/bootstrap/setup'

import { worker } from 'server/jobs/bucketBuild'

worker()
  .catch((e) => {
    setTimeout(() => {
      throw e
    })
  })
