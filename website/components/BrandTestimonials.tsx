import Image from "next/image";
import antDesign from "@/images/brands/ant-design.svg";
import doctolib from "@/images/brands/doctolib.svg";
import docusaurus from "@/images/brands/docusaurus.svg";
import lemonde from "@/images/brands/lemonde.svg";
import mui from "@/images/brands/mui.svg";

import { Container } from "./Container";

const Testimonials = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="[&_img]:invert">
      <Container className="hidden lg:flex justify-between items-baseline">
        {children}
      </Container>
      <div className="lg:hidden overflow-hidden relative">
        <div className="flex animate-[slide_20s_linear_infinite] w-max gap-10 pr-10">
          {children}
          {children}
        </div>
      </div>
    </div>
  );
};

export const BrandTestimonials = () => {
  return (
    <Testimonials>
      <Image
        src={antDesign}
        alt="Ant Design"
        className="brightness-0"
        style={{ paddingBottom: "8px" }}
      />
      <Image
        src={mui}
        alt="MUI"
        className="brightness-0"
        style={{ paddingBottom: 0 }}
      />
      <Image
        src={doctolib}
        alt="Doctolib"
        className="brightness-0"
        style={{ paddingBottom: "9px" }}
      />
      <Image
        src={lemonde}
        alt="Le Monde"
        className="brightness-0"
        style={{ paddingBottom: "10px" }}
      />
      <Image
        src={docusaurus}
        alt="docusaurus"
        style={{ width: 200, paddingBottom: "13px" }}
      />
    </Testimonials>
  );
};
