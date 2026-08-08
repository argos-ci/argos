import { Navigate } from "react-router";

export function UniversalNavigate(props: { to: string; replace?: boolean }) {
  const { to, replace } = props;
  if (to.startsWith("/")) {
    return <Navigate to={to} replace={replace} />;
  }
  if (replace) {
    window.location.replace(to);
  } else {
    // oxlint-disable-next-line react/react-compiler
    window.location.href = to;
  }
  return null;
}
