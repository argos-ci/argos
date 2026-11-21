import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { Link } from "@/ui/Link";

export function StaffAccessRestricted() {
  return (
    <Alert>
      <AlertTitle>Access restricted</AlertTitle>
      <AlertText>This page is only available to staff users.</AlertText>
      <AlertText>
        <Link href="/teams">Go to your teams</Link>
      </AlertText>
    </Alert>
  );
}
