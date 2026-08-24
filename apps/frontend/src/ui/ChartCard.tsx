import { clsx } from "clsx";

import { Card } from "./Card";

/**
 * A chart on its own surface, with a title above it.
 *
 * The white card is what separates a plot from the page around it: an axis
 * drawn straight onto the app background reads as part of the layout rather
 * than as a figure. The minimum height keeps a card that is still loading the
 * same size as one that has drawn, so a dashboard does not reflow under the
 * reader as its charts arrive.
 */
export function ChartCard(props: {
  className?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className={clsx("flex flex-col", props.className)}>
      <div className="flex items-start justify-between gap-4 p-5 pb-0">
        <div>
          <h3 className="font-semibold">{props.title}</h3>
          {props.description ? (
            <p className="text-low text-sm">{props.description}</p>
          ) : null}
        </div>
        {props.action ? <div className="shrink-0">{props.action}</div> : null}
      </div>
      <div className="flex min-h-72 flex-1 items-center justify-center p-5">
        {props.children}
      </div>
    </Card>
  );
}
