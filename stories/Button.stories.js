import { x } from "@xstyled/styled-components";
import { Button } from "@argos-ci/app/src/components";

const main = {
  title: "Button",
};

export default main;

export const Primary = () => (
  <x.div display="flex" flexDirection="column" gap={3}>
    <div>
      <Button>Contained</Button>
    </div>
    <div>
      <Button variant="outline">Outline</Button>
    </div>

    <div>
      <Button color="secondary">Contained</Button>
    </div>
    <div>
      <Button color="secondary" variant="outline">
        Outline
      </Button>
    </div>
  </x.div>
);
