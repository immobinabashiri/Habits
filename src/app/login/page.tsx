import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="glass rounded-xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log in to continue your habits.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </main>
  );
}