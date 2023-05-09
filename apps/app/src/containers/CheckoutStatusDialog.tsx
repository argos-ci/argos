import { useState } from "react";
import { useLocation } from "react-router-dom";

import config from "@/config";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogState,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { Anchor } from "@/ui/Link";

export type CheckoutStatus = "success" | "cancel" | null;

export const useCheckoutStatusDialog = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const checkoutParam = searchParams.get("checkout");
  const checkoutStatus: CheckoutStatus =
    checkoutParam === "success" || checkoutParam === "cancel"
      ? checkoutParam
      : null;
  const [showCheckoutDialog, setShowCheckoutDialog] = useState<boolean>(
    checkoutStatus !== null
  );

  const dialog = useDialogState({
    open: showCheckoutDialog,
    setOpen: (open) => {
      if (!open) {
        setShowCheckoutDialog(false);
      }
    },
  });
  return { dialog, checkoutStatus };
};

export const CheckoutStatusDialog = ({
  checkoutStatus,
  dialog,
}: {
  checkoutStatus: CheckoutStatus;
  dialog: DialogState;
}) => {
  return (
    <Dialog state={dialog} style={{ width: 560 }}>
      <DialogBody>
        <DialogTitle>
          {checkoutStatus === "success"
            ? "Subscription Confirmed"
            : "Subscription Failed"}
        </DialogTitle>
        <DialogText>
          {checkoutStatus === "success" ? (
            <>
              <div>
                We've received your subscription. Thank you for choosing Argos
                🎉
              </div>
              <div className="mt-2">
                You can now create build on your projects.
              </div>
            </>
          ) : (
            <>
              <div>
                Your subscription has been interrupted. You won't be able to
                create build until you subscribe to a paid plan.
              </div>
              <div className="mt-2">
                If you think this is a mistake, please{" "}
                <Anchor
                  tabIndex={-1}
                  href={`mailto:${config.get("contactEmail")}`}
                  external
                >
                  contact support
                </Anchor>
                .
              </div>
            </>
          )}
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss onClick={dialog.hide}>OK</DialogDismiss>
      </DialogFooter>
    </Dialog>
  );
};
