import { x } from "@xstyled/styled-components";
import { Container } from "./Container";

export interface TestimonialsProps {
  children: React.ReactNode;
  gap: number;
  repeat: number;
}

export const Testimonials: React.FC<TestimonialsProps> = ({
  children,
  gap,
  repeat,
}) => {
  return (
    <>
      <Container
        display={{ _: "none", lg: "flex" }}
        justifyContent="space-between"
      >
        {children}
      </Container>
      <x.div w={1} overflow="hidden" display={{ _: "block", lg: "none" }}>
        <x.div display="flex" justifyContent="center" w="fit-content">
          {Array.from({ length: repeat }).map((_, index) => (
            <x.div
              key={index}
              display="flex"
              w="max-content"
              animation="slide"
              gap={gap}
              pr={gap}
            >
              {children}
            </x.div>
          ))}
        </x.div>
      </x.div>
    </>
  );
};
