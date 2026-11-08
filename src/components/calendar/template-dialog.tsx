"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { toApiError } from "@/lib/api/client";
import { createTemplateRequest } from "@/lib/api/calendar-client";
import { CALENDAR_LIMITS } from "@/lib/domain/defaults";
import type { PublicPlanTemplate } from "@/types/calendar";
import type { DateKey } from "@/types/common";

// Names a template made from the week on screen.
export function TemplateDialog({
  weekStart,
  weekLabel,
  onClose,
  onSaved,
}: {
  weekStart: DateKey;
  weekLabel: string;
  onClose: () => void;
  onSaved: (template: PublicPlanTemplate) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("My week");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!name.trim()) {
      setError("Name the template.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      onSaved(await createTemplateRequest(name.trim(), weekStart));
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setError(apiError.fields.form ?? apiError.fields.name ?? apiError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
      <div>
        <h2 id="modal-title" className="type-h2">
          Save week as a template
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The single events, workouts, tasks and reminders of {weekLabel} are saved with their days and times.
          Repeating items are left out, since they come back on their own.
        </p>
      </div>
      <FormField
        id="template-name"
        label="Template name"
        value={name}
        maxLength={CALENDAR_LIMITS.maxTemplateName}
        autoComplete="off"
        data-autofocus
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
        disabled={pending}
      />
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onClose} className="btn btn-quiet px-4">
          Cancel
        </button>
        <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary px-5">
          {pending ? "Saving…" : "Save template"}
        </button>
      </div>
    </form>
  );
}
