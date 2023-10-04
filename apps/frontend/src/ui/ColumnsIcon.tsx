import * as React from "react";
import { SVGProps } from "react";

export const ColumnsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 16a.75.75 0 0 1-.75-.75V4.75a.75.75 0 0 1 1.5 0v10.5A.75.75 0 0 1 10 16Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 4c0-1.657 1.511-3 3.375-3h11.25C17.489 1 19 2.343 19 4v12c0 1.657-1.511 3-3.375 3H4.375C2.511 19 1 17.657 1 16V4Zm3.375-1.5c-.932 0-1.688.672-1.688 1.5v12c0 .828.756 1.5 1.688 1.5h11.25c.932 0 1.688-.672 1.688-1.5V4c0-.828-.756-1.5-1.688-1.5H4.375Z"
    />
  </svg>
);
