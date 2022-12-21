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
import visualTestingImage from "@/articles/visual-testing/main.jpg";
import improveDxImage from "@/articles/improve-dx/main.jpg";

export default function Blog() {
  return (
    <Container className="my-10" style={{ contain: "none" }}>
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
        <Link href="/blog/improve-dx" className="contents">
          <PostCard extended>
            <PostCardImage
              width={improveDxImage.width}
              height={improveDxImage.height}
              src={improveDxImage.src}
              blurDataURL={improveDxImage.blurDataURL}
              alt="Cosy guy with dog — Photo by devn"
              extended
            />
            <PostCardBody>
              <PostCardTag>Testing</PostCardTag>
              <PostCardTitle extended>
                How to improve developer experience with visual testing
              </PostCardTitle>
              <PostCardDescription>
                As a developer, it's important to have confidence in the code
                you're writing and the applications you're building. One way to
                achieve this confidence is through visual testing.
              </PostCardDescription>
              <PostCardFooter>
                <PostCardAuthor>Jeremy Sfez</PostCardAuthor>
                <Separator />
                <PostCardDate>Dec 21, 2022</PostCardDate>
              </PostCardFooter>
            </PostCardBody>
          </PostCard>
        </Link>

        <Link href="/blog/visual-testing" className="contents">
          <PostCard>
            <PostCardImage
              width={visualTestingImage.width}
              height={visualTestingImage.height}
              src={visualTestingImage.src}
              blurDataURL={visualTestingImage.blurDataURL}
              alt="Staircase / eye in library — Photo by Petri Heiskanen"
            />
            <PostCardBody>
              <PostCardTag>Testing</PostCardTag>
              <PostCardTitle>
                The Importance of Visual Testing in Ensuring UI Quality
              </PostCardTitle>
              <PostCardDescription>
                Visual testing is a critical part of ensuring the quality of a
                user interface. It involves comparing the visual appearance of a
                user interface to a set of predetermined criteria, in order to
                ensure that it meets design specifications and user
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
    </Container>
  );
}
