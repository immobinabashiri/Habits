"use client";

import { Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { REWARD_ICON_KEYS, RewardIcon } from "@/components/rewards/reward-icons";
import {
  buildRewardInput,
  draftFromReward,
  INITIAL_REWARD_DRAFT,
} from "@/components/rewards/reward-draft";
import type { RewardDraft, RewardFormErrors } from "@/components/rewards/reward-draft";
import { toApiError } from "@/lib/api/habits-client";
import { createRewardRequest, updateRewardRequest } from "@/lib/api/rewards-client";
import { LIMITS } from "@/lib/domain/defaults";
import type { PublicReward } from "@/types/reward";

interface RewardFormProps {
  reward?: PublicReward; // present = edit mode
  preset?: Partial<RewardDraft>; // starting values for a new reward (idea chips)
  categories: string[]; // existing categories, offered as suggestions
  onClose: () => void;
  onSaved: (reward: PublicReward) => void;
}

const chipFace =
  "inline-flex items-center justify-center rounded-md border border-input bg-card text-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-60";

export function RewardForm({ reward, preset, categories, onClose, onSaved }: RewardFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<RewardDraft>(() =>
    reward ? draftFromReward(reward) : { ...INITIAL_REWARD_DRAFT, ...preset },
  );
  const [errors, setErrors] = useState<RewardFormErrors>({});
  const [pending, setPending] = useState(false);

  function set<K extends keyof RewardDraft>(key: K, value: RewardDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const result = buildRewardInput(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      onSaved(
        reward
          ? await updateRewardRequest(reward.id, result.input)
          : await createRewardRequest(result.input),
      );
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      const hasFields = Object.keys(apiError.fields).length > 0;
      setErrors({ ...apiError.fields, ...(hasFields ? {} : { form: apiError.message }) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-h-[90dvh] flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="modal-title" className="text-lg font-bold tracking-tight">
          {reward ? "Edit reward" : "New reward"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto px-5 py-5">
        {errors.form ? (
          <p role="alert" className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
            {errors.form}
          </p>
        ) : null}

        <FormField
          id="reward-name"
          name="name"
          label="Name"
          placeholder="e.g. Coffee with a friend"
          maxLength={60}
          autoComplete="off"
          data-autofocus
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          disabled={pending}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="reward-price"
            name="price"
            label="Price (gems)"
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMITS.maxRewardPrice}
            value={draft.price}
            onChange={(e) => set("price", e.target.value)}
            error={errors.price}
            disabled={pending}
          />
          <div>
            <FormField
              id="reward-category"
              name="category"
              label="Category"
              placeholder="Custom Rewards"
              maxLength={40}
              autoComplete="off"
              list="reward-categories"
              value={draft.category}
              onChange={(e) => set("category", e.target.value)}
              error={errors.category}
              disabled={pending}
            />
            <datalist id="reward-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reward-description" className="text-sm font-medium">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="reward-description"
            name="description"
            rows={2}
            maxLength={300}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={pending}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "reward-description-error" : undefined}
            className="block w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-base text-card-foreground placeholder:text-muted-foreground disabled:opacity-60 aria-[invalid=true]:border-destructive"
          />
          {errors.description ? (
            <p id="reward-description-error" className="text-sm text-destructive">
              {errors.description}
            </p>
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Icon</legend>
          <div className="flex flex-wrap gap-2">
            {REWARD_ICON_KEYS.map((key) => (
              <label key={key} className="cursor-pointer" title={key}>
                <input
                  type="radio"
                  name="icon"
                  value={key}
                  checked={draft.icon === key}
                  onChange={() => set("icon", key)}
                  disabled={pending}
                  className="peer sr-only"
                />
                <span className={`${chipFace} size-11`}>
                  <RewardIcon name={key} className="size-5" />
                  <span className="sr-only">{key}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={draft.favorite}
            onChange={(e) => set("favorite", e.target.checked)}
            disabled={pending}
            className="size-5 accent-primary"
          />
          <span className="flex items-center gap-2 text-sm font-medium">
            <Star className="size-4 text-muted-foreground" aria-hidden="true" />
            Mark as favorite (shown first)
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-md px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : reward ? "Save changes" : "Add reward"}
        </button>
      </div>
    </form>
  );
}
