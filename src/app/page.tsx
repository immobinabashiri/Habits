import { Flame, Gem } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

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

// Decorative only: a glimpse of the app, hidden from screen readers.
function HeroPreview() {
  const rows = [
    { name: "Morning walk", done: true, streak: 12 },
    { name: "Read 10 pages", done: true, streak: 7 },
    { name: "Practice guitar", done: false, streak: 3 },
  ];
  return (
    <div aria-hidden="true" className="glass mx-auto mt-12 max-w-md rounded-xl p-5 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="type-h3">Today</p>
          <p className="text-sm text-muted-foreground">2 of 3 done</p>
        </div>
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-reward px-3 text-sm font-semibold text-reward-foreground">
          <Gem className="size-4" />
          240
        </span>
      </div>
      <div className="progress-track mt-3 h-2">
        <div className="progress-fill" style={{ width: "66%" }} />
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
            <span
              className={`size-5 shrink-0 rounded-full border-2 ${
                row.done ? "border-success bg-success-soft" : "border-input"
              }`}
            />
            <span className="flex-1 truncate font-medium">{row.name}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Flame className="size-3.5" />
              {row.streak}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Hero */}
          <section className="py-16 text-center sm:py-24">
            <h1 className="type-display mx-auto max-w-2xl">Build habits. Earn gems. Treat yourself.</h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Dayfacet turns your daily routines into a calm, rewarding game.
              Complete your habits, keep your streaks going, collect gems, and
              spend them on rewards you choose yourself.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              {session ? (
                <Link href="/dashboard" className="btn btn-primary min-h-12 px-6">
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="btn btn-primary min-h-12 px-6">
                    Create your account
                  </Link>
                  <Link href="/login" className="btn btn-outline min-h-12 px-6">
                    Log in
                  </Link>
                </>
              )}
            </div>

            <HeroPreview />
          </section>

          {/* How it works */}
          <section aria-labelledby="how-it-works" className="pb-16 sm:pb-24">
            <h2 id="how-it-works" className="type-h1 text-center">
              How it works
            </h2>

            <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="panel p-5">
                  <span
                    aria-hidden="true"
                    className="icon-bubble inline-flex size-8 items-center justify-center text-sm font-bold"
                  >
                    {index + 1}
                  </span>
                  <h3 className="type-h3 mt-3">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
