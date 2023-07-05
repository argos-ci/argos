import fg from "fast-glob";
import * as matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { StaticImageData } from "next/image";

export interface Article {
  filepath: string;
  title: string;
  description: string;
  slug: string;
  date: string;
  author: string;
  category?: string;
  image: StaticImageData;
  imageAlt: string;
}

const getFrontMatterErrors = (frontmatter: any) => {
  const errors = [];
  if (typeof frontmatter.title !== "string") {
    errors.push("`title` must be a string");
  }
  if (typeof frontmatter.description !== "string") {
    errors.push("`description` must be a string");
  }
  if (typeof frontmatter.slug !== "string") {
    errors.push("`slug` must be a string");
  }
  if (!(frontmatter.date instanceof Date)) {
    errors.push("`date` must be a date");
  }
  if (typeof frontmatter.author !== "string") {
    errors.push("`author` must be a string");
  }
  if (typeof frontmatter.image !== "string") {
    errors.push("`image` must be a string");
  }
  if (typeof frontmatter.imageAlt !== "string") {
    errors.push("`imageAlt` must be a string");
  }
  return errors;
};

export const getArticles = async (): Promise<Article[]> => {
  const files = await fg("./articles/**/*.mdx");
  const articles = await Promise.all(
    files.map(async (filepath) => {
      const frontmatter = matter.read(filepath).data;
      const dir = dirname(filepath).replace(/^.\/articles\//, "");
      const imagepath = join(dir, frontmatter.image);
      const { default: image } = await import(`../articles/${imagepath}`);
      const errors = getFrontMatterErrors(frontmatter);
      if (errors.length > 0) {
        throw new Error(
          `Invalid frontmatter in ${filepath}: ${errors.join(", ")}`
        );
      }

      return {
        filepath,
        image,
        imageAlt: frontmatter.imageAlt,
        title: frontmatter.title,
        description: frontmatter.description,
        slug: frontmatter.slug,
        date: frontmatter.date.toISOString(),
        author: frontmatter.author,
        category: frontmatter.category,
      };
    })
  );
  return articles.sort(
    (a, b) => Number(new Date(b.date)) - Number(new Date(a.date))
  );
};

export const getArticleBySlug = (articles: Article[], slug: string) => {
  return articles.find((article) => article.slug === slug) ?? null;
};

export const getDocMdxSource = async (article: Article) => {
  const source = await readFile(article.filepath, "utf-8");
  return serialize(source, {
    mdxOptions: {
      rehypePlugins: [rehypeHighlight],
      remarkPlugins: [remarkGfm, remarkFrontmatter],
    },
  });
};
