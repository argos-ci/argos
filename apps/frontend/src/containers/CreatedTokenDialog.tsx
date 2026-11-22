import { TriangleAlertIcon } from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { Pre } from "@/ui/Pre";

export function CreatedTokenDialog(props: {
  title: string;
  description: React.ReactNode;
  token: string;
  /** What the value is called in the warning, "token" by default. */
  noun?: string;
  children?: React.ReactNode;
}) {
  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogText>{props.description}</DialogText>
        <CreatedTokenValue
          token={props.token}
          noun={props.noun}
          className="mt-4"
        />
        {props.children}
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Close</DialogDismiss>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * A token's value, shown the only time it ever is.
 */
export function CreatedTokenValue(props: {
  token: string;
  noun?: string | undefined;
  className?: string;
}) {
  const { noun = "token" } = props;
  return (
    <div className={props.className}>
      <Pre code={props.token} />
      <div className="text-warning-low flex items-start gap-2 p-2 text-sm">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
        <p>Copy your {noun} now. You won’t be able to see it again.</p>
      </div>
    </div>
  );
}
