import { Container } from "./Container";
import { Loader, useDelayedVisible } from "./Loader";

export const PageLoader = () => {
  const visible = useDelayedVisible(400);
  return (
    <Container
      className="flex flex-col items-center gap-4 py-10 text-low"
      style={{
        visibility: visible ? "visible" : "hidden",
      }}
    >
      <Loader delay={0} />
      Loading, please be patient...
    </Container>
  );
};
