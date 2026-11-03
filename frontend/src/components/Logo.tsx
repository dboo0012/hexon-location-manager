export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <path
          d="M16 2c-6 0-10.5 4.5-10.5 10.3C5.5 20 16 30 16 30s10.5-10 10.5-17.7C26.5 6.5 22 2 16 2z"
          fill="#2a4bd7"
        />
        <circle cx="16" cy="12.5" r="4" fill="#f2c14e" />
      </svg>
      <span className="text-xl font-extrabold [font-stretch:80%]">Waypoints</span>
    </div>
  );
}
