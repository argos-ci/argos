import { promisify } from "node:util";
import * as Sentry from "@sentry/node";
import { tmpName as cbTmpName } from "tmp";
import type { TmpNameCallback, TmpNameOptions } from "tmp";

const promisifiedTmpName = promisify(
  (options: TmpNameOptions, cb: TmpNameCallback) => {
    cbTmpName(options, cb);
  },
);

/**
 * Promisified version of `tmpName` from `tmp` package.
 */
export async function tmpName(options: TmpNameOptions): Promise<string> {
  return Sentry.startSpan(
    {
      name: "tmpName",
      attributes: {
        "argos.tmp.postfix": options.postfix,
        "argos.tmp.prefix": options.prefix,
      },
    },
    () => promisifiedTmpName(options),
  );
}
