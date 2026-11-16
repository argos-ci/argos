import { expect, test } from "vitest";

import { getMaskHolesImageUrl } from "./layoutShift";

test("getMaskHolesImageUrl punches each hole out of the mask's box", () => {
  const url = getMaskHolesImageUrl(
    [
      { x: 0, y: 0, width: 200, height: 90 },
      { x: 10, y: 120, width: 5, height: 3 },
    ],
    {
      width: 200,
      height: 430,
    },
  );
  const svg = decodeURIComponent(url.replace("data:image/svg+xml,", ""));
  expect(svg).toContain('width="200" height="430" viewBox="0 0 200 430"');
  expect(svg).toContain(
    'fill-rule="evenodd" d="M0 0H200V430H0ZM0 0h200v90h-200ZM10 120h5v3h-5Z"',
  );
});
