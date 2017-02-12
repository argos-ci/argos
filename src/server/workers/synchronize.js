import 'server/bootstrap/setup'

import { worker } from 'server/jobs/synchronize'

worker().catch((e) => {
  setTimeout(() => { throw e })
})
