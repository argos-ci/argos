import { promisify } from "node:util";
import { tmpName as cbTmpName } from "tmp";
import type { TmpNameCallback, TmpNameOptions } from "tmp";

/**
 * Promisified version of `tmpName` from `tmp` package.
 */
export const tmpName = promisify(
  (options: TmpNameOptions, cb: TmpNameCallback) => {
    cbTmpName(options, cb);
  },
);
