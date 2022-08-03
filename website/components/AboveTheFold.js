import { x } from "@xstyled/styled-components";
import { Subtitle, Title } from "components/Titles";
import { Button } from "@components/Button";
import { Animation } from "./home-illustrations/Animation";
import { GradientText } from "./GradientText";

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
          <GradientText fontSize="6xl" fontWeight="800">
            Catch visual bugs
          </GradientText>
        </Title>
        <Subtitle>
          Argos is a visual testing solution that fits in your workflow to avoid
          visual regression. Takes screenshots on each commit and be notified if
          something changes.
        </Subtitle>
        <x.div display="flex" gap={4}>
          <Button
            as="a"
            href="https://docs.argos-ci.com"
            w={{ _: 1, sm: 200, lg: "auto" }}
          >
            Browse docs
          </Button>
          <Button
            as="a"
            href="https://app.argos-ci.com/mui/material-ui/builds/3915"
            w={{ _: 1, sm: 200, lg: "auto" }}
            $tint="cool-gray"
          >
            View a demo build
          </Button>
        </x.div>
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
