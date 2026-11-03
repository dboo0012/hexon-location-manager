import { useEffect, useRef } from "react";

export const POPUP_DURATION_MS = 3000;

interface Props {
  tone: "success" | "error";
  title: string;
  message: string;
  details?: string[];
  onDone: () => void;
  durationMs?: number;
}

/**
 * A modal notice that dismisses itself after `durationMs` (3 s by default, per the brief).
 * The bar along the bottom drains over the same period so the user can see when it will close.
 */
export function TimedPopup({ tone, title, message, details = [], onDone, durationMs = POPUP_DURATION_MS }: Props) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs]);

  const success = tone === "success";
  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-ink/40 p-4">
      <div
        role={success ? "status" : "alert"}
        aria-live={success ? "polite" : "assertive"}
        aria-labelledby="popup-title"
        className="popup-enter relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-[0_24px_48px_-16px_rgba(29,42,51,0.45)]"
      >
        <div className="flex gap-4 p-6">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              success ? "bg-success/12 text-success" : "bg-danger/12 text-danger"
            }`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {success ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M12 7v6m0 4h.01" />}
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id="popup-title" className="text-lg font-bold">
              {title}
            </h2>
            <p className="mt-1 text-ink-soft">{message}</p>
            {details.length > 0 && (
              <ul className="mt-3 max-h-32 space-y-0.5 overflow-y-auto text-sm text-ink-soft">
                {details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div
          className={`popup-timer h-1 ${success ? "bg-success" : "bg-danger"}`}
          style={{ animationDuration: `${durationMs}ms` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
