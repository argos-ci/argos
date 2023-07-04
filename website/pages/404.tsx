import { Button } from "@/components/Button";
import { Head } from "@/components/Head";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Head title="404 — Not found" />
      <section className="flex items-center h-full p-16">
        <div className="container flex flex-col items-center justify-center px-5 mx-auto my-8">
          <div className="max-w-lg text-center">
            <h2 className="mb-8 font-extrabold text-9xl">
              <span className="sr-only">Error</span>404
            </h2>
            <p className="text-2xl font-semibold md:text-3xl">
              Sorry, we couldn&apos;t find this page.
            </p>
            <p className="mt-4 mb-8 dark:text-gray-400">
              But dont worry, you can find plenty of other things on our
              homepage.
            </p>
            <Button asChild>
              <Link href="/">Back to homepage</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
