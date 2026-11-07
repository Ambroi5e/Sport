"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "./button";

/** Bouton d'envoi désactivé pendant l'envoi : un double tap n'envoie qu'une fois. */
export function SubmitButton({
  variant = "primary",
  size = "md",
  pendingLabel,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending || undefined} className={buttonClasses(variant, size, className)}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
