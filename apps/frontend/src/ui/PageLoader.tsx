import { Container } from "./Container";
import { Loader, useDelayedVisible } from "./Loader";

export function PageLoader() {
  const visible = useDelayedVisible(400);
  return (
    <Container
      className="flex flex-col items-center gap-4 py-10"
      style={{
        visibility: visible ? "visible" : "hidden",
      }}
    >
      <Loader className="size-16" delay={0} />
      <div className="text-low text-sm">Loading, please be patient...</div>
    </Container>
  );
}
