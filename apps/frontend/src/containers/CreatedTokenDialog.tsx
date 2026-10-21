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
  children?: React.ReactNode;
}) {
  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogText>{props.description}</DialogText>
        <Pre code={props.token} className="mt-4" />
        <div className="text-warning-low flex items-start gap-2 p-2 text-sm">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>Copy your token now. You won’t be able to see it again.</p>
        </div>
        {props.children}
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Close</DialogDismiss>
      </DialogFooter>
    </Dialog>
  );
}
