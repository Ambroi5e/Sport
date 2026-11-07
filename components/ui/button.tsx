import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-2 text-text border border-line hover:bg-line/60",
  ghost: "text-text hover:bg-surface-2",
  danger: "bg-transparent text-danger border border-danger/60 hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  md: "h-12 px-4 text-[15px]",
  lg: "h-14 px-5 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold",
    "transition-[transform,filter,background-color] duration-[120ms] ease-out-fonte active:scale-[0.98]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
