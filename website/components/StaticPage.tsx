import { Container } from "@/components/Container";
import { Head } from "@/components/Head";

export const StaticPage: React.FC<{
  children: React.ReactNode;
  title: string;
}> = ({ children, title }) => {
  return (
    <>
      <Head title={title} />
      <article
        className="prose prose-invert mx-auto max-w-none mt-14 mb-24"
        style={{ contain: "none" }}
      >
        <Container>{children}</Container>
      </article>
    </>
  );
};
