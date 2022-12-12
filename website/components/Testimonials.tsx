import { Container } from "./Container";

export const Testimonials = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="[&_img]:brightness-0 [&_img]:invert">
      <Container className="hidden lg:flex justify-between">
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
