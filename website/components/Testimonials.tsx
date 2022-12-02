import styled, { x } from "@xstyled/styled-components";
import { Container } from "./Container";

export interface TestimonialsProps {
  children: React.ReactNode;
  gap: number;
}

const TestimonialsContainer = styled.div`
  img {
    filter: brightness(0) invert(1);
  }
`;

const Slider = styled.box`
  overflow: hidden;
  position: relative;

  [data-slide-track] {
    animation: slide 20s linear infinite;
    width: max-content;
  }
`;

export const Testimonials: React.FC<TestimonialsProps> = ({
  children,
  gap,
}) => {
  return (
    <TestimonialsContainer>
      <Container
        display={{ _: "none", lg: "flex" }}
        justifyContent="space-between"
      >
        {children}
      </Container>
      <Slider display={{ _: "block", lg: "none" }}>
        <x.div data-slide-track="" display="flex" gap={gap} pr={gap}>
          {children}
          {children}
        </x.div>
      </Slider>
    </TestimonialsContainer>
  );
};
