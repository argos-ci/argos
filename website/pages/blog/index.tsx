/* eslint-disable react/no-unescaped-entities */
import { Container } from "@/components/Container";
import { Link } from "@/components/Link";
import { Head } from "@/components/Head";
import {
  PostCard,
  PostCardBody,
  PostCardTag,
  PostCardTitle,
  PostCardDescription,
  PostCardFooter,
  PostCardAuthor,
  PostCardDate,
  PostCardImage,
} from "@/components/PostCard";
import { Separator } from "@/components/Separator";
import { GetStaticProps, NextPage } from "next";
import { Article, getArticles } from "@/lib/api";

export const getStaticProps: GetStaticProps = async () => {
  const articles = await getArticles();
  return {
    props: {
      articles,
    },
  };
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
};

const Page: NextPage<{
  articles: Article[];
}> = (props) => {
  const firstArticle = props.articles[0];
  return (
    <Container className="my-10" style={{ contain: "none" }}>
      <Head title="Blog — Updates from the Argos team" />
      <div className="flex flex-col md:flex-row items-baseline gap-x-2">
        <h2 className="font-semibold text-white">Latest updates</h2>
        <div
          role="separator"
          aria-orientation="vertical"
          className="text-slate-600 hidden md:block"
        >
          |
        </div>
        <div className="text-sm text-on-light">
          All the latest Argos news, straight from the team.
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-20 gap-x-16 mt-12">
        <Link href={`/blog/${firstArticle.slug}`} className="contents">
          <PostCard extended>
            <PostCardImage
              width={firstArticle.image.width}
              height={firstArticle.image.height}
              src={firstArticle.image.src}
              alt={firstArticle.imageAlt}
              extended
            />
            <PostCardBody>
              {firstArticle.category && (
                <PostCardTag>{firstArticle.category}</PostCardTag>
              )}
              <PostCardTitle extended>{firstArticle.title}</PostCardTitle>
              <PostCardDescription>
                {firstArticle.description}
              </PostCardDescription>
              <PostCardFooter>
                <PostCardAuthor>{firstArticle.author}</PostCardAuthor>
                <Separator />
                <PostCardDate>{formatDate(firstArticle.date)}</PostCardDate>
              </PostCardFooter>
            </PostCardBody>
          </PostCard>
        </Link>

        {props.articles.slice(1).map((article) => {
          return (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="contents"
            >
              <PostCard>
                <PostCardImage
                  width={article.image.width}
                  height={article.image.height}
                  src={article.image.src}
                  alt={article.imageAlt}
                />
                <PostCardBody>
                  {article.category && (
                    <PostCardTag>{article.category}</PostCardTag>
                  )}
                  <PostCardTitle>{article.title}</PostCardTitle>
                  <PostCardDescription>
                    {article.description}
                  </PostCardDescription>
                  <PostCardFooter>
                    <PostCardAuthor>{article.author}</PostCardAuthor>
                    <Separator />
                    <PostCardDate>{formatDate(article.date)}</PostCardDate>
                  </PostCardFooter>
                </PostCardBody>
              </PostCard>
            </Link>
          );
        })}
      </div>
    </Container>
  );
};

export default Page;
