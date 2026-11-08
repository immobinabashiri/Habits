import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-16">
        <div className="glass rounded-xl p-6 sm:p-8">
          <h1 className="type-h1">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start building habits and earning gems.
          </p>
          <div className="mt-6">
            <SignupForm />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}