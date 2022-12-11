import Head from "next/head";
import { Container } from "@/components/Container";

export const StaticPage: React.FC<{
  children: React.ReactNode;
  title: string;
}> = ({ children, title }) => {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <article className="prose prose-invert mx-auto max-w-none mt-14 mb-24">
        <Container>{children}</Container>
      </article>
    </>
  );
};
