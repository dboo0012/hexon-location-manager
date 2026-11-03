import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "../store/authStore";
import { useLocationStore } from "../store/locationStore";
import { Logo } from "./Logo";

const NAV = [
  {
    to: "/map",
    label: "Map",
    icon: (
      <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13m6-10.5v13" />
    ),
  },
  {
    to: "/upload",
    label: "Upload file",
    icon: <path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />,
  },
];

/** Signed-in frame: sidebar navigation (a drawer on small screens) beside the page. */
export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const count = useLocationStore((s) => s.locations.length);
  const status = useLocationStore((s) => s.status);
  const load = useLocationStore((s) => s.load);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Locations are loaded once per session and shared by every page.
  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  // Close the mobile drawer after navigating.
  useEffect(() => setOpen(false), [pathname]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between bg-ink px-4 py-3 text-white md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="sidebar"
          className="rounded-md p-2 hover:bg-white/10"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      <aside
        id="sidebar"
        className={`${open ? "flex" : "hidden"} z-[1100] flex-col bg-ink text-white md:flex md:w-60 md:shrink-0`}
      >
        <div className="hidden px-5 pt-6 pb-8 md:block">
          <Logo />
        </div>

        <nav aria-label="Main" className="flex flex-col gap-1 px-3 py-3 md:py-0">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 font-medium transition-colors ${
                  isActive ? "bg-white text-ink" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon}
              </svg>
              <span className="flex-1">{item.label}</span>
              {item.to === "/map" && status === "ready" && (
                <span className="coords text-sm opacity-70" aria-label={`${count} saved places`}>
                  {count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/15 px-5 py-4">
          <p className="truncate text-sm text-white/70" title={user?.email}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex items-center gap-2 font-medium text-white/90 hover:text-survey"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
