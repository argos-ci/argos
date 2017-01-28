import 'server/bootstrap/setup'

import { worker } from 'server/jobs/screenshotDiff'

worker()
  .catch((e) => {
    setTimeout(() => {
      throw e
    })
  })
