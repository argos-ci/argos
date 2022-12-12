/* eslint-disable react/no-unescaped-entities */
import { Container } from "@/components/Container";
import { Link } from "@/components/Link";
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

export default function Blog() {
  return (
    <Container>
      <div className="text-center mt-20 mb-40">
        <h2 className="text-4xl leading-normal font-bold text-white">Blog</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-20 gap-x-16 mt-12">
          <Link href="/blog/visual-testing" className="contents">
            <PostCard extended>
              <PostCardImage
                extended
                alt="visual-testing"
                src="/visual-testing-950x450.png"
              />
              <PostCardBody>
                <PostCardTag>Testing</PostCardTag>
                <PostCardTitle extended>
                  The Importance of Visual Testing in Ensuring UI Quality
                </PostCardTitle>
                <PostCardDescription>
                  Visual testing is a critical part of ensuring the quality of a
                  user interface. It involves comparing the visual appearance of
                  a user interface to a set of predetermined criteria, in order
                  to ensure that it meets design specifications and user
                  expectations.
                </PostCardDescription>
                <PostCardFooter>
                  <PostCardAuthor>Jeremy Sfez</PostCardAuthor>
                  <Separator />
                  <PostCardDate>Dec 12, 2022</PostCardDate>
                </PostCardFooter>
              </PostCardBody>
            </PostCard>
          </Link>
        </div>
      </div>
    </Container>
  );
}
