"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: "sm" | "md";
  children: ReactNode; // rendered only while open, so its state resets every time
}

// Native <dialog>: showModal() gives focus trapping, Escape to close, an inert
// page behind it and focus return to the opener, for free.
// The content must contain a heading with id="modal-title" (used as the label).
// Put data-autofocus on the element that should get focus first.
export function Modal({ open, onClose, size = "md", children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // The content mounts while the dialog is still hidden, so autoFocus cannot work.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // The page behind a modal dialog should not scroll.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      onClose={onClose} // fires for Escape and for dialog.close()
      onClick={(event) => {
        // A click on the backdrop targets the <dialog> itself (it has no padding).
        if (event.target === event.currentTarget) onClose();
      }}
      // m-auto: Tailwind's reset removes the browser's default centering margin.
      // backdrop:bg-black/50 (not bg-foreground): foreground is near-white in dark mode.
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50 ${
        size === "sm" ? "max-w-sm" : "max-w-lg"
      }`}
    >
      {open ? children : null}
    </dialog>
  );
}
