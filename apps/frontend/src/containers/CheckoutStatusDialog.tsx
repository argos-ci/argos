import { useState } from "react";
import { useLocation } from "react-router-dom";

import config from "@/config";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { Link } from "@/ui/Link";
import { Modal } from "@/ui/Modal";

type CheckoutStatus = "success" | "cancel" | null;

export function CheckoutStatusDialog() {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const checkoutParam = searchParams.get("checkout");
  const checkoutStatus: CheckoutStatus =
    checkoutParam === "success" || checkoutParam === "cancel"
      ? checkoutParam
      : null;
  const [isOpen, setIsOpen] = useState<boolean>(checkoutStatus !== null);
  return (
    <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
      <Dialog>
        <DialogBody>
          <DialogTitle>
            {checkoutStatus === "success"
              ? "Subscription Confirmed"
              : "Subscription Failed"}
          </DialogTitle>
          {checkoutStatus === "success" ? (
            <>
              <DialogText>
                We've received your subscription. Thank you for choosing Argos
                🎉
              </DialogText>
              <DialogText>
                You can now create build on your projects.
              </DialogText>
            </>
          ) : (
            <>
              <DialogText>
                Your subscription has been interrupted. You won't be able to
                create build until you subscribe to a paid plan.
              </DialogText>
              <DialogText>
                If you think this is a mistake, please{" "}
                <Link
                  href={`mailto:${config.get("contactEmail")}`}
                  target="_blank"
                >
                  contact support
                </Link>
                .
              </DialogText>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>OK</DialogDismiss>
        </DialogFooter>
      </Dialog>
    </Modal>
  );
}
