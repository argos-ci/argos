import 'server/bootstrap/setup';

import { worker } from 'server/jobs/hello';

worker()
  .catch((e) => {
    setTimeout(() => {
      throw e;
    });
  });
