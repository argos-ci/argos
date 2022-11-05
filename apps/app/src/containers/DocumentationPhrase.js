import { x } from "@xstyled/styled-components";

import { Link } from "@/components";

export const DocumentationPhrase = (props) => {
  return (
    <x.span {...props}>
      Read{" "}
      <Link target="_blank" href="https://docs.argos-ci.com">
        Argos documentation
      </Link>{" "}
      for more information about installing and using it.
    </x.span>
  );
};
