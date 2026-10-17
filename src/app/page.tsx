import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden p-8">
      {/* Soft blobs so the glass blur is actually visible */}
      <div className="absolute -top-20 -left-20 size-72 rounded-full bg-accent/50 blur-3xl" />
      <div className="absolute top-40 right-0 size-72 rounded-full bg-primary/30 blur-3xl" />

      <div className="relative mx-auto max-w-xl space-y-4">
        <ThemeToggle />

        <h1 className="text-2xl font-bold">Token test</h1>
        <p className="text-muted-foreground">
          Muted text on the page background.
        </p>

        <div className="glass rounded-xl p-5">
          <p className="font-semibold">Glass card</p>
          <p className="text-sm text-muted-foreground">
            Translucent surface with blur.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
          Solid card
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
            Primary
          </button>
          <button className="rounded-md bg-secondary px-4 py-2 font-semibold text-secondary-foreground">
            Secondary
          </button>
          <span className="rounded-full bg-success-soft px-3 py-1 text-sm text-success">
            Completed
          </span>
          <span className="rounded-full bg-reward px-3 py-1 text-sm text-reward-foreground">
            +30 gems
          </span>
          <span className="rounded-full border border-destructive px-3 py-1 text-sm text-destructive">
            Error
          </span>
        </div>
      </div>
    </main>
  );
}