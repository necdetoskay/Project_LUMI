import type { ButtonHTMLAttributes } from "react";

export function SubmitButton({
  pending,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Kaydediliyor..." : children}
    </button>
  );
}
