import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="page flex flex-1 items-center justify-center">
        <div className="empty-box flex w-full max-w-md flex-col items-center gap-4 px-6 py-14 text-center">
          <span aria-hidden="true" className="icon-bubble inline-flex size-14 items-center justify-center">
            <Compass className="size-7" />
          </span>
          <div>
            <h1 className="type-h1">Page not found</h1>
            <p className="mt-1 text-muted-foreground">This page does not exist or may have moved.</p>
          </div>
          <Link href="/" className="btn btn-primary px-5">
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
