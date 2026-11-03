import type { ReactNode } from "react";
import { Logo } from "./Logo";

/** Shared frame for the sign-in and registration screens. */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="contours flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo className="mb-8 text-ink" />
        <div className="rounded-lg border border-contour bg-white/95 p-6 shadow-[0_1px_0_#c9d6cf,0_12px_32px_-12px_rgba(29,42,51,0.25)] sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 mb-6 text-ink-soft">{intro}</p>
          {children}
        </div>
        <p className="mt-6 text-center text-ink-soft">{footer}</p>
      </div>
    </main>
  );
}
