import { Navigate } from "react-router-dom";

export function UniversalNavigate(props: { to: string; replace?: boolean }) {
  const { to, replace } = props;
  if (to.startsWith("/")) {
    return <Navigate to={to} replace={replace} />;
  }
  if (replace) {
    window.location.replace(to);
  } else {
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = to;
  }
  return null;
}
