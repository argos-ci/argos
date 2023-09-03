import { Navigate } from "react-router-dom";

export const UniversalNavigate = ({
  to,
  replace,
}: {
  to: string;
  replace?: boolean;
}) => {
  if (to.startsWith("/")) {
    return <Navigate to={to} replace={replace} />;
  }
  if (replace) {
    window.location.replace(to);
  } else {
    window.location.href = to;
  }
  return null;
};
