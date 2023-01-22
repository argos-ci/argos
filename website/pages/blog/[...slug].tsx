import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";

import { StaticPage } from "@/components/StaticPage";
import {
  Article,
  getArticleBySlug,
  getDocMdxSource,
  getArticles,
} from "@/lib/api";
import { MainImage } from "@/components/Post";
import { useMemo } from "react";
import { Separator } from "@/components/Separator";

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params?.slug) return { notFound: true };
  const slugParam = params.slug as string[];
  const slug = slugParam.join("/");
  const articles = await getArticles();
  const article = getArticleBySlug(articles, slug);
  if (!article) return { notFound: true };
  const source = await getDocMdxSource(article);
  return {
    props: {
      article,
      source,
    },
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const articles = await getArticles();
  const paths = articles
    .filter((article) => article.slug !== "")
    .map((article) => ({ params: { slug: article.slug.split("/") } }));

  return {
    paths,
    fallback: false,
  };
};

const Page: NextPage<{
  source: MDXRemoteSerializeResult;
  article: Article;
}> = (props) => {
  const { article } = props;
  const components = useMemo(() => {
    return {
      MainImage: ({ credit }: { credit: React.ReactNode }) => {
        return (
          <MainImage
            width={article.image.width}
            height={article.image.height}
            src={article.image.src}
            alt={article.imageAlt}
            credit={credit}
          />
        );
      },
    };
  }, [article]);
  return (
    <StaticPage title={article.title}>
      {article.category && (
        <div className="text-on-light mb-4">{article.category}</div>
      )}
      <h1>{article.title}</h1>
      <div className="text-on-light my-4 flex gap-2 text-sm">
        {new Intl.DateTimeFormat("en-US", {
          dateStyle: "long",
        }).format(new Date(article.date))}
        <Separator />
        {article.author}
      </div>
      <MDXRemote {...props.source} components={components} />
    </StaticPage>
  );
};

export default Page;
