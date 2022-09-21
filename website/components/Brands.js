import { x } from "@xstyled/styled-components";
import { MuiLogo } from "components/MuiLogo";
import { Image } from "./Image";
import doctolibLogo from "img/doctolib-logo.png";
import leMondeLogo from "img/lemonde-logo.png";

const Brand = (props) => (
  <x.div
    display="flex"
    alignItems="center"
    justifyContent="center"
    flex={1}
    h={{ _: "150px", md: 24 }}
    borderStyle="dashed"
    mt={10}
    {...props}
  />
);

export const Brands = (props) => (
  <x.div display="flex" justifyContent="space-between" {...props}>
    <Brand pr={{ _: 5, sm: 10 }}>
      <Image src={doctolibLogo} alt="Doctolib" maxW="200px" />
    </Brand>
    <Brand>
      <x.div
        as={MuiLogo}
        aria-label="Material UI"
        h="60%"
        w={{ _: "40%", md: "auto" }}
        maxW="200px"
      />
    </Brand>
    <Brand pl={{ _: 5, sm: 10 }}>
      <Image src={leMondeLogo} alt="Le Monde" maxW="200px" />
    </Brand>
  </x.div>
);
