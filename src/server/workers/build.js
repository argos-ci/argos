import 'server/bootstrap/setup'

import { worker } from 'server/jobs/build'

worker().catch((e) => {
  setTimeout(() => { throw e })
})
