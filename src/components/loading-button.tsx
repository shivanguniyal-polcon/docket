"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";

export interface SubmitButtonProps extends ComponentProps<"button"> {
  pendingText?: ReactNode;
  icon?: ReactNode;
}

/**
 * Enhanced submit button that automatically connects to React's useFormStatus().
 * When a form submission is in-flight, it immediately:
 * 1. Disables the button to prevent duplicate submissions.
 * 2. Renders an animated loading spinner.
 * 3. Shows pendingText (e.g. "Saving…", "Applying…", "Filtering…").
 * 4. Adds cursor-wait and visual feedback.
 */
export function SubmitButton({
  children,
  pendingText,
  icon,
  className = "",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className={`relative inline-flex items-center justify-center transition-all ${
        pending ? "cursor-wait opacity-80" : ""
      } ${className}`}
      {...props}
    >
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          {pendingText !== "" && (
            <span>{pendingText !== undefined ? pendingText : children}</span>
          )}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {children && <span>{children}</span>}
        </span>
      )}
    </button>
  );
}

/**
 * Enhanced client button for asynchronous onClick handlers.
 * Shows loading spinner and disables while the promise is resolving.
 */
export function AsyncActionButton({
  children,
  loadingText,
  onClick,
  icon,
  className = "",
  disabled,
  ...props
}: {
  children: ReactNode;
  loadingText?: ReactNode;
  onClick?: () => Promise<void> | void;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
} & Omit<ComponentProps<"button">, "onClick">) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (loading || disabled) return;
    if (!onClick) return;
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center transition-all ${
        loading ? "cursor-wait opacity-80" : ""
      } ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          {loadingText !== "" && (
            <span>{loadingText !== undefined ? loadingText : children}</span>
          )}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {children && <span>{children}</span>}
        </span>
      )}
    </button>
  );
}
