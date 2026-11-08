"use client";

import { useEffect } from "react";

export interface ToastMessage {
  id: number;
  text: string;
}

function Toast({ message, onDismiss }: { message: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(message.id), 4500);
    return () => window.clearTimeout(timer);
  }, [message.id, onDismiss]);

  return (
    <li className="glass toast-in rounded-lg px-4 py-2.5 text-sm font-semibold">
      {message.text}
    </li>
  );
}

// role="status" makes screen readers announce each reward as it appears.
export function RewardToasts({
  messages,
  onDismiss,
}: {
  messages: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <ul
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm flex-col gap-2"
    >
      {messages.map((message) => (
        <Toast key={message.id} message={message} onDismiss={onDismiss} />
      ))}
    </ul>
  );
}
