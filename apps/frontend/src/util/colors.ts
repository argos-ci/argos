export type UIColor =
  | "primary"
  | "info"
  | "success"
  | "neutral"
  | "pending"
  | "danger"
  | "warning";

export const lowTextColorClassNames: Record<UIColor, string> = {
  primary: "text-primary-low",
  info: "text-info-low",
  success: "text-success-low",
  neutral: "text-low",
  pending: "text-pending-low",
  danger: "text-danger-low",
  warning: "text-warning-low",
};

export const bgColorClassNames: Record<UIColor, string> = {
  primary: "bg-primary-solid",
  info: "bg-info-solid",
  success: "bg-success-solid",
  neutral: "bg-solid",
  pending: "bg-pending-solid",
  danger: "bg-danger-solid",
  warning: "bg-warning-solid",
};
