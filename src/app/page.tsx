import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

const STEPS = [
  {
    title: "Create your habits",
    text: "Pick the routines that matter to you and choose which days they happen. Mark the essentials as core habits and the extras as bonus.",
  },
  {
    title: "Complete them, build streaks",
    text: "Check habits off each day to earn XP and gems. Keep a habit going on its scheduled days and your streak grows.",
  },
  {
    title: "Spend gems on rewards",
    text: "Gems are yours to spend in your own reward shop. Add the treats you actually want and save up for a bigger goal.",
  },
];

export default async function Home() {
  // The navbar and footer come from (public)/layout.tsx, not from this page.
  const session = await getServerSession(authOptions);

  return (
    <main className="relative overflow-hidden">
      {/* Decorative soft blobs behind the hero */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -left-24 size-72 rounded-full bg-accent/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute top-32 -right-24 size-72 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <section className="py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Build habits. Earn gems. Treat yourself.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Gem Habits turns your daily routines into a calm, rewarding game.
            Complete your habits, keep your streaks going, collect gems, and
            spend them on rewards you choose yourself.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Create your account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-6 font-semibold text-card-foreground transition-colors hover:bg-muted"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-it-works" className="pb-16 sm:pb-24">
          <h2
            id="how-it-works"
            className="text-center text-2xl font-bold tracking-tight"
          >
            How it works
          </h2>

          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-border bg-card p-5 text-card-foreground"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                >
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}