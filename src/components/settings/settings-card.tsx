import type { ReactNode } from "react";

// One block of the settings page: a heading, a short explanation, then the controls.
export function SettingsCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="panel p-5">
      <h2 id={`${id}-title`} className="type-h2">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// The result of the last save. role=status / role=alert make screen readers announce it.
export function SaveStatus({ error, saved }: { error: string | null; saved: string | null }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  }
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {saved}
    </p>
  );
}

export const primaryButton =
  "btn btn-primary px-5";
export const quietButton =
  "btn btn-quiet px-4";
