import { type InputHTMLAttributes, useId } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Labelled input with an accessible, inline error message. */
export function FormField({ label, error, hint, className = "", ...input }: Props) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      <input
        id={id}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        {...input}
      />
      {error ? (
        <p id={messageId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
