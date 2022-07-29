import { x } from "@xstyled/styled-components";
import { Subtitle, Title } from "components/Titles";
import { Button } from "@components/Button";
import { Animation } from "./home-illustrations/Animation";

export const AboveTheFold = (props) => {
  return (
    <x.div
      display="flex"
      flexDirection={{ _: "column", lg: "row" }}
      justifyContent="space-between"
      alignItems="center"
      columnGap={10}
      rowGap={20}
    >
      <x.div
        flex={{ _: 1, lg: 1 / 2 }}
        alignItems={{ _: "flex-start", sm: "center", lg: "flex-start" }}
        display="flex"
        flexDirection="column"
        gap={8}
      >
        <Title {...props}>
          Automate Visual Testing
          <br />
          <x.span color="primary-400">Catch visual bugs</x.span>
        </Title>
        <Subtitle>
          Argos is a visual testing solution that fits in your workflow to avoid
          visual regression. Takes screenshots on each commit and be notified if
          something changes.
        </Subtitle>
        <Button
          as="a"
          href="https://docs.argos-ci.com"
          w={{ _: 1, sm: 200, lg: "auto" }}
          h={10}
        >
          Get started
        </Button>
      </x.div>
      <x.div
        display="flex"
        flex={{ lg: 1 / 2 }}
        w={1}
        justifyContent={{ _: "center", lg: "flex-start" }}
        overflow="hidden"
        position="relative"
      >
        <Animation />
      </x.div>
    </x.div>
  );
};
