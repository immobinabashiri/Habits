"use client";

import { BellRing, CheckCircle2, ExternalLink, Send, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { primaryButton, quietButton, SaveStatus, SettingsCard } from "@/components/settings/settings-card";
import { toApiError } from "@/lib/api/client";
import {
  disconnectTelegramRequest,
  getTelegramStatusRequest,
  saveNotificationPrefsRequest,
  startTelegramLinkRequest,
} from "@/lib/api/settings-client";
import { formatTime } from "@/lib/domain/calendar";
import type { TelegramLinkStart, TelegramNotificationPrefs, TelegramStatus } from "@/types/notifications";

type TimedKey = "habitReminder" | "incompleteReminder" | "dailySummary";

const TIMED: { key: TimedKey; label: string; hint: string }[] = [
  { key: "habitReminder", label: "Morning reminder", hint: "Lists today's habits, if any are waiting." },
  { key: "incompleteReminder", label: "Evening check", hint: "Only when habits are still open." },
  { key: "dailySummary", label: "Daily summary", hint: "What you finished and what you didn't." },
];

const POLL_MS = 3000;

// Connect a Telegram chat with a single-use link, see the connection, choose reminders.
export function TelegramSection({ initial }: { initial: TelegramStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [link, setLink] = useState<TelegramLinkStart | null>(null);
  const [prefs, setPrefs] = useState<TelegramNotificationPrefs>(initial.prefs);
  const [pending, setPending] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // While a link is open, watch for the bot to confirm the connection. Stops when it
  // does, or when the link expires.
  useEffect(() => {
    if (!link || status.connected) return;
    const expires = Date.parse(link.expiresAt);
    const id = window.setInterval(async () => {
      if (Date.now() > expires) {
        setLink(null);
        setMessage("The link expired. Create a new one when you're ready.");
        return;
      }
      try {
        const next = await getTelegramStatusRequest();
        if (next.connected) {
          setStatus(next);
          setPrefs(next.prefs);
          setLink(null);
          setMessage("Connected! Your reminders will arrive in Telegram.");
        }
      } catch {
        // A missed poll is harmless; the next one tries again.
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [link, status.connected]);

  function fail(caught: unknown) {
    const apiError = toApiError(caught);
    if (apiError.code === "UNAUTHENTICATED") {
      router.push("/login");
      return;
    }
    setError(Object.values(apiError.fields)[0] ?? apiError.message);
  }

  async function connect() {
    if (pending) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      setLink(await startTelegramLinkRequest());
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      setStatus(await disconnectTelegramRequest());
      setConfirmDisconnect(false);
      setMessage("Disconnected. Telegram won't receive anything from now on.");
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveNotificationPrefsRequest(prefs);
      setPrefs(saved);
      setStatus((current) => ({ ...current, prefs: saved }));
      setMessage("Saved.");
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(false);
    }
  }

  const setTimed = (key: TimedKey, patch: Partial<TelegramNotificationPrefs[TimedKey]>) =>
    setPrefs((current) => ({ ...current, [key]: { ...current[key], ...patch } }));

  return (
    <div id="telegram" className="scroll-mt-24">
      <SettingsCard
        id="telegram-card"
        title="Telegram"
        description="Get habit reminders and your calendar reminders as Telegram messages."
      >
        {!status.configured ? (
          <p className="alert border-border bg-muted/50 text-muted-foreground">
            Telegram reminders aren&apos;t available on this server yet. The bot still has to be set up.
          </p>
        ) : !status.connected ? (
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Tap <b className="text-foreground">Connect Telegram</b> to get a private link.</li>
              <li>Telegram opens @{status.botUsername}. Tap <b className="text-foreground">Start</b>.</li>
              <li>This page updates by itself once the bot confirms.</li>
            </ol>
            {link ? (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary gap-2 px-5"
                >
                  <Send className="size-4" aria-hidden="true" />
                  Open Telegram
                  <ExternalLink className="size-3.5 opacity-80" aria-hidden="true" />
                </a>
                <p className="text-sm text-muted-foreground" role="status">
                  Waiting for Telegram… The link works once and expires at{" "}
                  {new Date(link.expiresAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. Don&apos;t share it.
                </p>
              </div>
            ) : (
              <button type="button" onClick={connect} disabled={pending} aria-busy={pending} className={`${primaryButton} gap-2`}>
                <Send className="size-4" aria-hidden="true" />
                {pending ? "Creating link…" : "Connect Telegram"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                <span>
                  Connected{status.telegramUsername ? <> as <b>@{status.telegramUsername}</b></> : null}
                  {status.linkedAt ? (
                    <span className="text-muted-foreground">
                      {" "}since {new Date(status.linkedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  ) : null}
                </span>
              </p>
              {confirmDisconnect ? (
                <span className="flex gap-2">
                  <button type="button" data-autofocus onClick={() => setConfirmDisconnect(false)} className={quietButton}>
                    Keep
                  </button>
                  <button type="button" onClick={disconnect} disabled={pending} className="btn btn-danger px-4">
                    Disconnect
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDisconnect(true)} className={`${quietButton} gap-2`}>
                  <Unlink className="size-4" aria-hidden="true" />
                  Disconnect
                </button>
              )}
            </div>

            <form onSubmit={save} className="space-y-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="switch"
                  checked={prefs.enabled}
                  onChange={(e) => setPrefs((current) => ({ ...current, enabled: e.target.checked }))}
                  disabled={pending}
                />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <BellRing className="size-4 text-muted-foreground" aria-hidden="true" />
                  Send reminders to Telegram
                </span>
              </label>

              <fieldset disabled={!prefs.enabled || pending} className="space-y-3 disabled:opacity-60">
                <legend className="sr-only">Reminders</legend>
                {TIMED.map(({ key, label, hint }) => (
                  <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="switch"
                        checked={prefs[key].enabled}
                        onChange={(e) => setTimed(key, { enabled: e.target.checked })}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block text-xs text-muted-foreground">{hint}</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="sr-only">{label} time</span>
                      <input
                        type="time"
                        step={300}
                        value={prefs[key].time}
                        onChange={(e) => e.target.value && setTimed(key, { time: e.target.value })}
                        disabled={!prefs[key].enabled}
                        className="field min-h-11 w-36"
                        aria-describedby="telegram-tz"
                      />
                    </label>
                  </div>
                ))}
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <input
                    type="checkbox"
                    className="switch"
                    checked={prefs.calendarReminders}
                    onChange={(e) => setPrefs((current) => ({ ...current, calendarReminders: e.target.checked }))}
                  />
                  <span>
                    <span className="block text-sm font-medium">Calendar reminders</span>
                    <span className="block text-xs text-muted-foreground">For calendar items that have a reminder set.</span>
                  </span>
                </label>
              </fieldset>
              <p id="telegram-tz" className="text-xs text-muted-foreground">
                Times are in your time zone, {status.timezone} (change it above). Morning:{" "}
                {formatTime(prefs.habitReminder.time)}. Nothing is sent on days without habits due.
              </p>
              <button type="submit" disabled={pending} aria-busy={pending} className={primaryButton}>
                {pending ? "Saving…" : "Save reminders"}
              </button>
            </form>
          </div>
        )}
        <div className="mt-3">
          <SaveStatus error={error} saved={message} />
        </div>
      </SettingsCard>
    </div>
  );
}
