import { BellIcon, BellOffIcon } from "lucide-react";

import { IconButton } from "@/ui/IconButton";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";

/**
 * The bell that follows or unfollows a comment feed's notifications.
 *
 * Commenting already subscribes you, so this is mostly how you opt out — or opt
 * in without saying anything. The caller owns the mutation (a build and a test
 * are followed through different ones) and the wording; the button owns the
 * icon, the label and the success/failure toast, all keyed on `toastId` so
 * toggling twice replaces the toast instead of stacking two.
 */
export function SubscribeToggleButton(props: {
  subscribed: boolean;
  /** Toggles the subscription to `subscribed`. */
  onToggle: (subscribed: boolean) => Promise<unknown>;
  /** Distinguishes this feed's toast from any other on screen. */
  toastId: string;
  subscribedMessage: string;
  unsubscribedMessage: string;
}) {
  const {
    subscribed,
    onToggle,
    toastId,
    subscribedMessage,
    unsubscribedMessage,
  } = props;
  const label = subscribed ? "Unsubscribe" : "Subscribe";
  const handlePress = () => {
    onToggle(!subscribed)
      .then(() => {
        toast.success(subscribed ? unsubscribedMessage : subscribedMessage, {
          id: toastId,
        });
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error), { id: toastId });
      });
  };
  return (
    <Tooltip content={label}>
      <IconButton rounded size="small" aria-label={label} onPress={handlePress}>
        {subscribed ? <BellOffIcon /> : <BellIcon />}
      </IconButton>
    </Tooltip>
  );
}
