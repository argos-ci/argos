import { Fragment } from "react";
import { AlertTriangleIcon, ArrowRightIcon } from "lucide-react";

import { BrowserIcon } from "../metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../metadata/browser/browserLabels";
import {
  getBrowserVersionChangeKey,
  type BrowserVersionChange,
} from "../metadata/browser/browserVersionChange";
import { SectionHeader } from "./shared";

export function BrowserVersionNotice(props: {
  changes: BrowserVersionChange[];
}) {
  const { changes } = props;
  const [first] = changes;
  if (!first) {
    return null;
  }
  const title = changes.every((change) => change.name === first.name)
    ? `${getBrowserLabel(first.name)} version changed since the baseline`
    : "Browser versions changed since the baseline";

  return (
    <div
      role="note"
      className="border-thin border-warning bg-warning-subtle flex gap-3 rounded-xl px-4 py-3 text-sm"
    >
      <span className="flex h-lh shrink-0 items-center">
        <AlertTriangleIcon className="text-warning-low size-4" />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <SectionHeader noMargin>{title}</SectionHeader>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1">
          {changes.map((change) => (
            <Fragment key={getBrowserVersionChangeKey(change)}>
              <dt className="flex items-center gap-1.5 font-medium">
                <BrowserIcon browser={change} className="size-4 shrink-0" />
                {getBrowserLabel(change.name)}
              </dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-xs tabular-nums">
                <span className="sr-only">Baseline</span>
                <span className="text-low">{change.baseVersion}</span>
                {/* The arrow wraps with the version it points to. */}
                <span className="flex items-center gap-1.5">
                  <ArrowRightIcon
                    className="text-low size-3 shrink-0"
                    aria-hidden
                  />
                  <span className="sr-only">This build</span>
                  <span>{change.compareVersion}</span>
                </span>
              </dd>
            </Fragment>
          ))}
        </dl>
        <p className="text-low">
          Some changes may come from the browser, not your code.
        </p>
      </div>
    </div>
  );
}
