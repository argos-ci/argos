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

export const bgSolidColorClassNames: Record<UIColor, string> = {
  primary: "bg-primary-solid",
  info: "bg-info-solid",
  success: "bg-success-solid",
  neutral: "bg-solid",
  pending: "bg-pending-solid",
  danger: "bg-danger-solid",
  warning: "bg-warning-solid",
};

export const bgSolidColors: Record<UIColor, string> = {
  primary: "var(--background-color-primary-solid)",
  info: "var(--background-color-info-solid)",
  success: "var(--background-color-success-solid)",
  neutral: "var(--background-color-neutral-solid)",
  pending: "var(--background-color-pending-solid)",
  danger: "var(--background-color-danger-solid)",
  warning: "var(--background-color-warning-solid)",
};
